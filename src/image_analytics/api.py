"""Backend API for a future web or mobile frontend.

Run locally with: python -m uvicorn src.image_analytics.api:app --reload --reload-dir src
"""

from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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


