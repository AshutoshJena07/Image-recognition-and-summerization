"""Backend API for a future web or mobile frontend.

Run locally with: python -m uvicorn src.image_analytics.api:app --reload
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
    image: UploadFile = File(..., description="A JPG, JPEG, PNG, or WEBP image"),
    prompt: str = Form(DEFAULT_PROMPT, description="Question or instruction about the image"),
    history: str = Form("[]", description="Recent chat turns supplied by the local browser"),
) -> dict[str, str]:
    """Return a response generated from the image and the user's prompt."""
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WEBP image.")

    try:
        uploaded_image = Image.open(BytesIO(await image.read())).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc

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
        answer = get_vision_assistant().answer(uploaded_image, prompt, safe_history)
    except OSError as exc:
        raise HTTPException(
            status_code=503,
            detail="Local model could not be loaded. Check your internet for the first download, then try again.",
        ) from exc

    return {"prompt": prompt, "answer": answer, "model": "Local BLIP vision model"}
