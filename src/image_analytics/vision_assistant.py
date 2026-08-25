"""Local image-and-prompt assistant powered by a BLIP vision-language model.

No cloud API or API key is used. The model is downloaded once from Hugging Face
and then loaded from the local cache on future runs.

OCR support: text-heavy images (documents, question papers, screenshots) are
automatically detected and processed via EasyOCR before being sent to the LLM.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import TypedDict

import requests
import torch
from PIL import Image

VQA_MODEL = "Salesforce/blip-vqa-base"
DEFAULT_PROMPT = "Describe this image in one clear sentence."

# Keywords that suggest the user wants a broad description / caption
CAPTION_KEYWORDS = {
    "caption",
    "describe",
    "description",
    "detailed",
    "detail",
    "explain",
    "explanation",
    "summary",
    "summarize",
    "summarise",
    "tell me about",
}

# Keywords that suggest the user wants text extracted / document read
DOCUMENT_KEYWORDS = {
    "read",
    "extract",
    "ocr",
    "text",
    "written",
    "write",
    "writing",
    "handwriting",
    "handwritten",
    "name",
    "word",
    "words",
    "signature",
    "sign",
    "say",
    "says",
    "question paper",
    "document",
    "paper",
    "notes",
    "letter",
    "summarize this",
    "summarise this",
    "what does it say",
    "what is written",
    "what is writing",
    "translate",
}

# Minimum characters from OCR to consider the image text-bearing
OCR_MIN_CHARS = 2

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"


class ChatTurn(TypedDict):
    role: str
    content: str


class LocalVisionAssistant:
    """Answer a user instruction about an image with a locally run VLM.

    Routing logic:
      1. If the image contains text (EasyOCR) OR user prompt asks about text/writing -> text path.
      2. Otherwise -> visual path (BLIP VQA -> Qwen).
    """

    def __init__(self, model_name: str = VQA_MODEL) -> None:
        # Imports stay here so API health checks work before the large model loads.
        from transformers import BlipForQuestionAnswering, BlipProcessor

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        cache_dir = os.getenv("HF_HOME", "hf_cache")
        self.processor = BlipProcessor.from_pretrained(model_name, cache_dir=cache_dir)
        self.model = BlipForQuestionAnswering.from_pretrained(model_name, cache_dir=cache_dir)
        self.model.to(self.device).eval()
        self.cache_dir = cache_dir
        self._ocr_reader = None  # lazy-loaded on first use

    # ── public ────────────────────────────────────────────────────────────────

    @torch.inference_mode()
    def answer(
        self,
        image: Image.Image,
        prompt: str | None = None,
        history: list[ChatTurn] | None = None,
    ) -> str:
        """Generate an image-grounded answer for the supplied instruction."""
        instruction = (prompt or DEFAULT_PROMPT).strip()
        if not instruction:
            instruction = DEFAULT_PROMPT
        rgb_image = image.convert("RGB")

        # Resize very large images for significantly faster CPU processing
        max_dim = 1600
        if max(rgb_image.size) > max_dim:
            rgb_image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # ── Route: OCR path or BLIP path ──────────────────────────────────────
        ocr_text = self._extract_text_ocr(rgb_image)
        has_text = len(ocr_text.strip()) >= OCR_MIN_CHARS
        normalized = instruction.lower()
        wants_text = any(kw in normalized for kw in DOCUMENT_KEYWORDS)

        if wants_text or has_text:
            if ocr_text:
                visual_context = f"Text/Writing extracted from image via OCR:\n{ocr_text}"
            else:
                visual_context = "No readable text could be extracted from the image via OCR."
            return self._write_chat_response(
                instruction, visual_context, history or [], is_document=True
            )

        # Fallback / normal images → BLIP VQA
        visual_context = self._get_visual_context(rgb_image, instruction)
        return self._write_chat_response(instruction, visual_context, history or [])

    # ── OCR helpers ───────────────────────────────────────────────────────────

    def _get_ocr_reader(self):
        """Lazy-load EasyOCR reader (downloads model on first call)."""
        if self._ocr_reader is None:
            try:
                import easyocr
                self._ocr_reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available(), verbose=False)
            except Exception:
                return None
        return self._ocr_reader

    def _extract_text_ocr(self, image: Image.Image) -> str:
        """Run EasyOCR on the image and return joined text."""
        reader = self._get_ocr_reader()
        if reader is None:
            return ""
        try:
            import numpy as np
            img_array = np.array(image)
            results = reader.readtext(img_array, detail=0, paragraph=True)
            return "\n".join(results).strip()
        except Exception:
            return ""


    # ── BLIP helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _needs_caption(instruction: str) -> bool:
        """Route broad description requests away from the short-answer VQA model."""
        normalized = instruction.lower()
        return any(keyword in normalized for keyword in CAPTION_KEYWORDS)

    def _answer_question(self, image: Image.Image, question: str) -> str:
        """Extract one visual fact using the local VQA model."""
        inputs = self.processor(images=image, text=question, return_tensors="pt")
        inputs = {name: value.to(self.device) for name, value in inputs.items()}
        output = self.model.generate(**inputs, max_new_tokens=60)
        return self.processor.decode(output[0], skip_special_tokens=True).strip()

    def _get_visual_context(self, image: Image.Image, instruction: str) -> str:
        """Build reliable visual context before handing it to the text model."""
        object_answer = self._answer_question(image, "What is the main object or scene in this image?")
        if self._needs_caption(instruction):
            scene_answer = self._answer_question(image, "What is the setting, style, or background in this image?")
            return f"Detected main subject: {object_answer}. Detected setting or style: {scene_answer}."
        answer = self._answer_question(image, instruction)
        return f"Detected main subject: {object_answer}. Direct visual answer: {answer}."

    # ── LLM response ──────────────────────────────────────────────────────────

    @staticmethod
    def _write_chat_response(
        instruction: str,
        visual_context: str,
        history: list[ChatTurn],
        is_document: bool = False,
    ) -> str:
        """Use the already-installed local Qwen model for a natural response."""
        recent_turns = history[-8:]
        history_text = "\n".join(
            f"{turn['role'].title()}: {turn['content']}" for turn in recent_turns
        ) or "No earlier conversation."

        if is_document:
            # Document / OCR mode — focus on the extracted text
            prompt = f"""You are a helpful document assistant. The user has uploaded an image containing text (like a question paper, document, or notes).
The text has been extracted from the image using OCR and is provided below.
Respond clearly and helpfully to the user's request based on this extracted text.
For summaries, be concise and structured. For questions about content, answer directly.

Previous conversation:
{history_text}

User request: {instruction}
Extracted text from image:
{visual_context}

Answer:"""
        else:
            # Normal image / scene mode
            prompt = f"""You are a helpful image assistant. Reply naturally and clearly to the user's request.
Use only the visual evidence below. Do not say that you cannot see the image and do not invent details.
For descriptions or captions, write 2 to 4 useful sentences. For direct questions, answer directly first and then add brief context if useful.

Previous conversation:
{history_text}

User request: {instruction}
Visual evidence from local image models: {visual_context}

Answer:"""

        try:
            response = requests.post(
                OLLAMA_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 300}},
                timeout=180,
            )
            response.raise_for_status()
            answer = response.json().get("response", "").strip()
            if answer:
                return answer
        except requests.RequestException:
            pass
        return visual_context


@lru_cache(maxsize=1)
def get_vision_assistant() -> LocalVisionAssistant:
    """Create one shared model instance instead of loading it for every request."""
    return LocalVisionAssistant()
