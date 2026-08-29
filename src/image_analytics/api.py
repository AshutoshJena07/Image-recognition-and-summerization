"""Backend API for a future web or mobile frontend.

Run locally with: python -m uvicorn src.image_analytics.api:app --reload --reload-dir src
"""

from __future__ import annotations

import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Header, Body
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError

from src.image_analytics.vision_assistant import DEFAULT_PROMPT, get_vision_assistant

app = FastAPI(
    title="Local Image Assistant",
    description="Image + user prompt -> locally generated answer. No external AI API is used.",
    version="0.1.0",
)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="assets")


@app.get("/", include_in_schema=False)
def homepage() -> FileResponse:
    """Serve the local browser interface."""
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "loaded on first analysis request"}


@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(None, description="Image, PDF, Word, PPT, Excel, Video, or Text file"),
    image: UploadFile = File(None, description="Backwards compatible file upload parameter"),
    prompt: str = Form(DEFAULT_PROMPT, description="Question or instruction about the uploaded file"),
    history: str = Form("[]", description="Recent chat turns supplied by the local browser"),
) -> dict[str, str]:
    """Return a response generated from the uploaded file (image, PDF, Word, Excel, Video, Text) and user prompt."""
    target_upload = file or image
    uploaded_image = None
    extracted_text_context = ""

    if target_upload is not None:
        file_bytes = await target_upload.read()
        filename = target_upload.filename or "uploaded_file"
        content_type = target_upload.content_type or ""

        from src.image_analytics.file_parser import parse_uploaded_file
        uploaded_image, extracted_text_context = parse_uploaded_file(file_bytes, filename, content_type)

    try:
        parsed_history = json.loads(history)
        if not isinstance(parsed_history, list):
            parsed_history = []
        safe_history = [
            {"role": str(turn.get("role", "user"))[:12], "content": str(turn.get("content", ""))[:600]}
            for turn in parsed_history[-8:]
            if isinstance(turn, dict)
        ]
    except json.JSONDecodeError:
        safe_history = []

    try:
        answer = get_vision_assistant().answer(
            uploaded_image,
            prompt,
            safe_history,
            extra_text_context=extracted_text_context
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=503,
            detail="Local model could not be loaded. Check your internet for the first download, then try again.",
        ) from exc

    return {"prompt": prompt, "answer": answer, "model": "Local Universal Multimodal Assistant"}



EMOTION_MAP = {
    "happy": "happy",
    "excited": "excited",
    "joy": "happy",
    "joyful": "happy",
    "bright": "happy",
    "sad": "sad",
    "emotional": "sad",
    "grief": "sad",
    "sorrow": "sad",
    "angry": "anger",
    "anger": "anger",
    "controlled": "calm",
    "firm": "calm",
    "irritated": "anger",
    "calm": "calm",
    "professional": "calm",
    "reassuring": "calm",
    "gentle": "calm",
    "comforting": "calm",
    "warm": "calm",
    "fear": "fear",
    "urgency": "fear",
    "urgent": "fear",
    "tense": "fear",
    "worried": "fear",
    "nervous": "fear",
    "surprised": "surprise",
    "surprise": "surprise",
    "whisper": "whisper",
    "secretive": "whisper",
    "quiet": "whisper",
    "sarcastic": "happy",
    "playful": "happy",
    "relieved": "calm",
    "neutral": "neutral",
}


def parse_script_emotion_segments(full_text: str) -> list[tuple[str, str]]:
    """
    Parse a script into (spoken_text, emotion_tag) segments.
    Strips bracket tags [Happy], speaker names FRIDAY:, and parenthetical stage directions (pause).
    """
    import re
    lines = full_text.splitlines()
    segments = []
    current_emotion = "neutral"

    for line in lines:
        raw = line.strip()
        if not raw or raw.startswith("#") or raw == "[END]":
            continue

        # Detect and parse emotion bracket tag e.g. [HAPPY / EXCITED] or [Sad]
        bracket_match = re.search(r"\[([A-Za-z0-9_\s\/\\-]+)\]", raw)
        if bracket_match:
            tag_text = bracket_match.group(1).lower()
            found_emotion = None
            for word in re.split(r"[\s\/\\-]+", tag_text):
                if word in EMOTION_MAP:
                    found_emotion = EMOTION_MAP[word]
                    break
            if found_emotion:
                current_emotion = found_emotion

            # Remove bracket tag from line
            raw = re.sub(r"\[([A-Za-z0-9_\s\/\\-]+)\]", "", raw).strip()
            if not raw:
                continue

        # Remove speaker names e.g. FRIDAY (calm, confident): or Character:
        spoken = re.sub(r"^[A-Za-z0-9_\s]+\s*(\([^)]*\))?\s*:\s*", "", raw)
        # Remove parenthetical stage directions e.g. (pause), *(short breath)*
        spoken = re.sub(r"\*?\([^)]*\)\*?", "", spoken)
        # Clean markdown symbols
        spoken = re.sub(r"[*_~#]+", "", spoken).strip()

        if spoken:
            if segments and segments[-1][1] == current_emotion:
                segments.append((spoken, current_emotion))
            else:
                segments.append((spoken, current_emotion))

    if not segments:
        clean_fallback = re.sub(r"\[([A-Za-z0-9_\s\/\\-]+)\]", "", full_text)
        clean_fallback = re.sub(r"^[A-Za-z0-9_\s]+\s*(\([^)]*\))?\s*:\s*", "", clean_fallback, flags=re.MULTILINE)
        clean_fallback = re.sub(r"\*?\([^)]*\)\*?", "", clean_fallback)
        clean_fallback = re.sub(r"[*_~#]+", "", clean_fallback).strip()
        if clean_fallback:
            segments.append((clean_fallback, "neutral"))

    return segments


def combine_wav_audio_chunks(wav_chunks: list[bytes]) -> bytes:
    """Concatenate PCM WAV audio chunks into a single valid WAV file."""
    import struct
    valid_chunks = [c for c in wav_chunks if len(c) > 44]
    if not valid_chunks:
        return b""
    if len(valid_chunks) == 1:
        return valid_chunks[0]

    combined_pcm = bytearray()
    first_header = bytearray(valid_chunks[0][:44])

    for chunk in valid_chunks:
        combined_pcm.extend(chunk[44:])

    total_data_len = len(combined_pcm)
    total_file_len = total_data_len + 36

    first_header[4:8] = struct.pack("<I", total_file_len)
    first_header[40:44] = struct.pack("<I", total_data_len)

    return bytes(first_header + combined_pcm)


@app.post("/tts")
async def tts_cartesia(data: dict):
    """Synthesize text into ultra-realistic natural AI voice audio via Cartesia Sonic 3.6 API with per-segment emotion control."""
    text = (data.get("text") or "").strip()
    explicit_emotion = (data.get("emotion") or "").strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty.")

    import requests

    headers = {
        "X-API-Key": "sk_car_bjKoNB8aHDqmHQZMfnSuMK",
        "Cartesia-Version": "2026-08-14",
        "Content-Type": "application/json"
    }

    segments = parse_script_emotion_segments(text[:4000])
    wav_audio_chunks = []

    for spoken_text, parsed_emotion in segments:
        target_emotion = explicit_emotion or EMOTION_MAP.get(parsed_emotion, "neutral")

        payload = {
            "model_id": "sonic-3.6",
            "transcript": spoken_text,
            "voice": {
                "mode": "id",
                "id": "faf0731e-dfb9-4cfc-8119-259a79b27e12"
            },
            "output_format": {
                "container": "wav",
                "encoding": "pcm_s16le",
                "sample_rate": 44100
            },
            "generation_config": {
                "speed": 1.0,
                "volume": 1.0,
                "emotion": target_emotion
            }
        }

        try:
            res = requests.post("https://api.cartesia.ai/tts/bytes", headers=headers, json=payload, timeout=20)
            if res.status_code == 200 and len(res.content) > 0:
                wav_audio_chunks.append(res.content)
            else:
                print(f"[Cartesia TTS Warning] Segment synthesis failed ({res.status_code}): {res.text}")
        except Exception as exc:
            print(f"[Cartesia TTS Warning] Failed segment synthesis request: {exc}")

    if wav_audio_chunks:
        final_wav = combine_wav_audio_chunks(wav_audio_chunks)
        from fastapi.responses import Response
        return Response(content=final_wav, media_type="audio/wav")
    else:
        raise HTTPException(status_code=502, detail="Cartesia TTS synthesis failed for script segments.")



@app.post("/api/v1/speech/synthesize")
async def synthesize_speech(
    text: str = Form(..., description="Text to synthesize into spoken audio")
) -> dict[str, str | bool]:
    """Synthesize text into spoken speech metadata or fallback guidance."""
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty.")

    try:
        import pyttsx3
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        voice_count = len(voices) if voices else 0
        return {
            "status": "ready",
            "text": clean_text,
            "backend": "cartesia_ai",
            "voices_available": voice_count,
            "message": "Use /tts for Cartesia AI natural voice synthesis or browser Web Speech API."
        }
    except Exception as exc:
        return {
            "status": "fallback",
            "text": clean_text,
            "backend": "web_speech_api",
            "message": f"Server-side TTS notice: {exc}."
        }


# =====================================================================
# DATABASE SETTING & PERSISTENCE
# =====================================================================

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "assistant.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 2. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    
    # 3. Conversations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        messages_json TEXT NOT NULL,
        attachments_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    
    conn.commit()
    conn.close()

@app.on_event("startup")
def startup_event():
    # Automatically initialize SQLite schemas on startup
    init_db()

# =====================================================================
# PASSWORD SECURITY & SESSIONS HELPERS
# =====================================================================

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${pw_hash}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, pw_hash = hashed.split("$")
        test_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
        return test_hash == pw_hash
    except Exception:
        return False

def get_current_user(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    token = authorization.split(" ")[1]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, expires_at FROM sessions WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")
        
    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.utcnow():
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=401, detail="Session token expired.")
        
    return row["user_id"]

# =====================================================================
# AUTHENTICATION PAYLOAD STRUCTURES
# =====================================================================

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ConversationSaveRequest(BaseModel):
    id: str
    title: str
    messages: list
    attachments: list

# =====================================================================
# AUTH ROUTES
# =====================================================================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    email = req.email.strip().lower()
    password = req.password
    if not email or len(password) < 6:
        raise HTTPException(status_code=400, detail="Invalid email or password must be at least 6 characters.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pw_hash = hash_password(password)
        cursor.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, pw_hash))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    conn.close()
    return {"status": "success", "message": "User registered successfully."}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    token = secrets.token_hex(32)
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", (token, user["id"], expires_at))
    conn.commit()
    conn.close()
    
    return {"token": token, "email": email}

@app.post("/api/auth/logout")
async def logout(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
         raise HTTPException(status_code=400, detail="Authorization token required.")
    token = authorization.split(" ")[1]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Session invalidated."}

@app.get("/api/auth/me")
async def get_me(authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": user_id, "email": user["email"]}

# =====================================================================
# CONVERSATION HISTORY ROUTES
# =====================================================================

@app.get("/api/conversations")
async def list_conversations(authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, created_at, updated_at, attachments_json FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", 
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    conversations = []
    for r in rows:
        conversations.append({
            "id": r["id"],
            "title": r["title"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "attachments": json.loads(r["attachments_json"])
        })
    return conversations

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, messages_json, attachments_json FROM conversations WHERE id = ? AND user_id = ?", 
        (conversation_id, user_id)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    return {
        "id": row["id"],
        "title": row["title"],
        "messages": json.loads(row["messages_json"]),
        "attachments": json.loads(row["attachments_json"])
    }

@app.post("/api/conversations")
async def save_conversation(req: ConversationSaveRequest, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?", (req.id, user_id))
        exists = cursor.fetchone()
        
        now = datetime.utcnow().isoformat()
        messages_str = json.dumps(req.messages)
        attachments_str = json.dumps(req.attachments)
        
        if exists:
            cursor.execute(
                "UPDATE conversations SET title = ?, messages_json = ?, attachments_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (req.title, messages_str, attachments_str, now, req.id, user_id)
            )
        else:
            cursor.execute(
                "INSERT INTO conversations (id, user_id, title, messages_json, attachments_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (req.id, user_id, req.title, messages_str, attachments_str, now, now)
            )
        conn.commit()
    except sqlite3.Error as exc:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    
    conn.close()
    return {"status": "success", "message": "Conversation saved."}

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Conversation deleted."}



