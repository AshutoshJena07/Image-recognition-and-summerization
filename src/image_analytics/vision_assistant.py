"""Local image-and-prompt assistant powered by a BLIP vision-language model.

No cloud API or API key is used. The model is downloaded once from Hugging Face
and then loaded from the local cache on future runs.

OCR support: text-heavy images (documents, question papers, screenshots) are
automatically detected and processed via EasyOCR before being sent to the LLM.
"""

from __future__ import annotations

import os
import base64
import time
from io import BytesIO
from functools import lru_cache
from typing import TypedDict

import requests
import torch
from PIL import Image
import numpy as np

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
OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen2.5vl:3b"


class ChatTurn(TypedDict):
    role: str
    content: str


class LocalVisionAssistant:
    """Answer a user instruction about an image with a locally run VLM.

    Routing logic:
      1. If the user prompt asks about text/writing -> text path (OCR + Qwen).
      2. Otherwise -> direct multimodal path (Qwen2.5-VL with original image).
      3. Fallback -> BLIP VQA + Qwen text.
    """

    def __init__(self, model_name: str = VQA_MODEL) -> None:
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.cache_dir = os.getenv("HF_HOME", "hf_cache")
        
        # Lazy loaded models
        self.processor = None
        self.model = None
        self._ocr_reader = None
        
        # Scoped session caches
        self.active_image = None
        self.cached_processed_image = None
        self.cached_base64_image = None
        self.cached_ocr_text = None
        self.cached_quality_desc = None
        self.cached_blip_context = None

    def _clear_cache(self) -> None:
        """Invalidate the session caches."""
        self.cached_processed_image = None
        self.cached_base64_image = None
        self.cached_ocr_text = None
        self.cached_quality_desc = None
        self.cached_blip_context = None

    def _load_blip_fallback(self) -> None:
        """Lazy-load the BLIP model only on fallback."""
        if self.model is None:
            from transformers import BlipForQuestionAnswering, BlipProcessor
            self.processor = BlipProcessor.from_pretrained(self.model_name, cache_dir=self.cache_dir)
            self.model = BlipForQuestionAnswering.from_pretrained(self.model_name, cache_dir=self.cache_dir)
            self.model.to(self.device).eval()

    def _analyze_and_preprocess_image(self, image: Image.Image) -> tuple[Image.Image, str]:
        """Analyze original image quality and generate preprocessed version for OCR/BLIP."""
        from PIL import ImageOps, ImageFilter, ImageStat

        # Convert to grayscale for quick statistical checks
        gray = image.convert("L")
        stat = ImageStat.Stat(gray)
        mean = stat.mean[0]
        stddev = stat.stddev[0]
        w, h = image.size

        quality_flags = []
        
        # 1. Check resolution
        if max(w, h) < 300:
            quality_flags.append("low-resolution")
            
        # 2. Check contrast
        if stddev < 20:
            quality_flags.append("low contrast")
            
        # 3. Check brightness
        if mean < 25:
            quality_flags.append("extremely dark")
        elif mean > 230:
            quality_flags.append("extremely bright")

        # 4. Check blur using Laplacian variance
        img_np = np.array(gray, dtype=np.float32)
        if img_np.shape[0] > 2 and img_np.shape[1] > 2:
            laplacian = (
                img_np[1:-1, 0:-2] + 
                img_np[1:-1, 2:] + 
                img_np[0:-2, 1:-1] + 
                img_np[2:, 1:-1] - 
                4.0 * img_np[1:-1, 1:-1]
            )
            lap_var = np.var(laplacian)
        else:
            lap_var = 100.0

        if lap_var < 80.0:
            quality_flags.append("blurry/unclear")

        quality_desc = ", ".join(quality_flags) if quality_flags else "clear"

        # Generate preprocessed image for EasyOCR/BLIP ONLY
        processed = image.copy()
        
        # Upscale genuinely tiny images
        if max(w, h) < 200:
            processed = processed.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
            
        # Mild contrast normalization if contrast is very low
        if stddev < 20:
            processed = ImageOps.autocontrast(processed, cutoff=2)
            
        # Mild sharpening if slightly blurry but has some edge information
        if 20.0 < lap_var < 80.0:
            processed = processed.filter(ImageFilter.SHARPEN)

        return processed, quality_desc

    def _get_base64_image(self, image: Image.Image) -> str:
        """Convert a PIL Image to a base64 encoded JPEG string (excluding newlines)."""
        buffered = BytesIO()
        rgb_image = image.convert("RGB")
        # Resize to max 1600 dim to prevent payload size issues
        max_dim = 1600
        if max(rgb_image.size) > max_dim:
            rgb_image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        rgb_image.save(buffered, format="JPEG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

    @torch.inference_mode()
    def answer(
        self,
        image: Image.Image | None,
        prompt: str | None = None,
        history: list[ChatTurn] | None = None,
    ) -> str:
        """Generate an image-grounded answer using Ollama /api/chat with Qwen2.5-VL and BLIP fallback."""
        start_time = time.time()
        instruction = (prompt or "").strip()
        if not instruction:
            instruction = DEFAULT_PROMPT

        # Scoping & Invalidation
        if image is not None:
            self.active_image = image
            self._clear_cache()
        elif not history:
            # Active image is cleared / new session started
            self.active_image = None
            self._clear_cache()
            raise ValueError("No active image in session. Please upload an image first.")
        elif self.active_image is None:
            raise ValueError("No active image in session. Please upload an image first.")

        # Ensure base image is converted to RGB
        rgb_image = self.active_image.convert("RGB")

        # 1. Run quality analysis and create processed version (lazy cached)
        preprocessing_start = time.time()
        if self.cached_processed_image is None:
            processed_img, quality_desc = self._analyze_and_preprocess_image(rgb_image)
            self.cached_processed_image = processed_img
            self.cached_quality_desc = quality_desc
        preprocessing_duration = time.time() - preprocessing_start

        # 2. Base64 Encoding (lazy cached)
        encoding_start = time.time()
        if self.cached_base64_image is None:
            self.cached_base64_image = self._get_base64_image(rgb_image)
        encoding_duration = time.time() - encoding_start

        normalized = instruction.lower()
        wants_text = any(kw in normalized for kw in DOCUMENT_KEYWORDS)

        # 3. Lazy OCR run (only if explicitly requested)
        ocr_start = time.time()
        ocr_text = ""
        if wants_text:
            if self.cached_ocr_text is None:
                self.cached_ocr_text = self._extract_text_ocr(self.cached_processed_image)
            ocr_text = self.cached_ocr_text
        ocr_duration = time.time() - ocr_start

        # ── Route 1: Try Direct Multimodal Qwen2.5-VL via /api/chat ───────────
        try:
            # System prompt for qualitative uncertainty and entity recognition
            system_instruction = """You are a helpful, uncertainty-aware local image assistant.
Answer the user's questions about the uploaded image.
- For clear images, respond directly and naturally, blending visual observations with your general knowledge if the user asks about recognized entities (e.g. Spider-Man, characters, objects, landmarks).
- If the user asks to read/extract text, use the provided OCR text (if any) and the image layout to transcribe it.
- If the image has quality issues (e.g. blurry, low contrast, dark), be honest about the quality but do not refuse to identify the object if it is still recognizable. Use qualifying phrases like "It appears to be..." or "The image is somewhat blurry/dark, but shows...".
- Only declare that you cannot identify the object if the image genuinely lacks sufficient visual information to make a reasonable judgment.
"""
            if self.cached_quality_desc != "clear":
                system_instruction += f"\nNote: Image quality analysis has flagged the following issues: {self.cached_quality_desc}. Adjust your response confidence accordingly."

            # Construct the chat message sequence
            messages = [{"role": "system", "content": system_instruction}]

            # Build history turns
            history_turns = history or []
            for i, turn in enumerate(history_turns):
                msg = {
                    "role": turn["role"],
                    "content": turn["content"]
                }
                # Attach the image to the first message in the history
                if i == 0:
                    msg["images"] = [self.cached_base64_image]
                messages.append(msg)

            # Build current user message content
            current_content = instruction
            if wants_text and ocr_text:
                current_content += f"\n\n[Supplementary OCR text extracted from image]:\n{ocr_text}"

            if not history_turns:
                # First turn: attach image to the current user message
                messages.append({
                    "role": "user",
                    "content": current_content,
                    "images": [self.cached_base64_image]
                })
            else:
                # Subsequent turns: standard text user message (image already cached in history)
                messages.append({
                    "role": "user",
                    "content": current_content
                })

            ollama_start = time.time()
            response = requests.post(
                OLLAMA_CHAT_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": -1,
                    "options": {"num_predict": 300}
                },
                timeout=180,
            )
            response.raise_for_status()
            ollama_duration = time.time() - ollama_start
            
            answer = response.json().get("message", {}).get("content", "").strip()
            total_duration = time.time() - start_time
            
            # Log performance metrics
            print(f"[Performance Metrics] Preprocessing: {preprocessing_duration:.3f}s | "
                  f"Encoding: {encoding_duration:.3f}s | OCR: {ocr_duration:.3f}s | "
                  f"Ollama Request: {ollama_duration:.3f}s | Total: {total_duration:.3f}s")
            
            if answer:
                return answer
        except requests.RequestException as e:
            print(f"[Ollama Chat Error] Falling back to local BLIP model: {e}")
            pass

        # ── Route 2: Fallback to Local BLIP ───────────────────────────────────
        self._load_blip_fallback()
        
        if wants_text:
            if not ocr_text:
                if self.cached_ocr_text is None:
                    self.cached_ocr_text = self._extract_text_ocr(self.cached_processed_image)
                ocr_text = self.cached_ocr_text
            if ocr_text:
                context = f"Text/Writing extracted from image via OCR:\n{ocr_text}"
            else:
                context = "No readable text could be extracted from the image via OCR."
            answer = self._write_chat_response(instruction, context, history or [], is_document=True)
        else:
            if self.cached_blip_context is None:
                self.cached_blip_context = self._get_visual_context(self.cached_processed_image, instruction)
                if self.cached_quality_desc != "clear":
                    self.cached_blip_context += f" Note: The image quality is low or the visual evidence is unclear ({self.cached_quality_desc})."
            answer = self._write_chat_response(instruction, self.cached_blip_context, history or [])
            
        total_duration = time.time() - start_time
        print(f"[Performance Metrics Fallback] Total: {total_duration:.3f}s (BLIP fallback used)")
        return answer

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
        
        # Check image quality / clarity
        is_blurry = self._answer_question(image, "Is this image blurry?")
        is_dark = self._answer_question(image, "Is this image dark?")
        
        if self._needs_caption(instruction):
            scene_answer = self._answer_question(image, "What is the setting, style, or background in this image?")
            visual_context = f"Detected main subject: {object_answer}. Detected setting or style: {scene_answer}."
        else:
            answer = self._answer_question(image, instruction)
            visual_context = f"Detected main subject: {object_answer}. Direct visual answer: {answer}."

        if is_blurry.strip().lower() == "yes" or is_dark.strip().lower() == "yes":
            visual_context += " Note: The image quality is low or the visual evidence is unclear/blurry."
        return visual_context

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

        # Detect if clarity check has negative indicators
        vc_lower = visual_context.lower()
        is_unclear = "low or the visual evidence is unclear/blurry" in vc_lower
        
        if is_unclear:
            uncertainty_instruction = """
IMPORTANT: The visual evidence indicates the image is blurry, dark, unclear, or low-resolution. 
You must prefer uncertainty and clearly state that the image is unclear or dark, and that you cannot reliably identify the details. 
Do NOT guess, invent, or confidently state details like objects, colors, or text that are not clearly visible. 
For example, respond with something like: 'The image is a bit unclear, so I can't reliably identify the object.'"""
        else:
            uncertainty_instruction = ""

        if is_document:
            # Document / OCR mode — focus on the extracted text
            prompt = f"""You are a helpful document assistant. The user has uploaded an image containing text (like a question paper, document, or notes).
The text has been extracted from the image using OCR and is provided below.
Respond clearly and helpfully to the user's request based on this extracted text.
For summaries, be concise and structured. For questions about content, answer directly.
{uncertainty_instruction}

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
{uncertainty_instruction}

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
