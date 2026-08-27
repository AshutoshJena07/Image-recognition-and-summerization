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

# Keywords that suggest the user specifically wants text extracted / document read
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
    "signature",
    "sign",
    "say",
    "says",
    "question paper",
    "document",
    "paper",
    "notes",
    "letter",
    "transcribe",
    "what does it say",
    "what is written",
    "what is writing",
    "translate",
    "script",
    "perform",
    "performance",
    "act",
    "acting",
    "dialogue",
    "dialogues",
    "lines",
    "recite",
    "role",
    "character",
    "speech",
    "monologue",
    "play",
    "story",
    "recitation",
    "quote",
    "words",
    "speak",
}


# Minimum characters from OCR to consider the image text-bearing
OCR_MIN_CHARS = 2


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_OLLAMA_TEXT_MODEL = "qwen2.5:1.5b"


def get_installed_ollama_models() -> tuple[str | None, str]:
    """Auto-detect installed vision and text models in Ollama."""
    try:
        r = requests.get("http://127.0.0.1:11434/api/tags", timeout=2)
        if r.status_code == 200:
            names = [m.get("name", "") for m in r.json().get("models", [])]
            vision_model = next((n for n in names if any(k in n.lower() for k in ["vl", "vision", "llava"])), None)
            text_model = next((n for n in names if "qwen" in n.lower()), None) or \
                         next((n for n in names if "gemma" in n.lower()), None) or \
                         (names[0] if names else DEFAULT_OLLAMA_TEXT_MODEL)
            return vision_model, text_model
    except Exception:
        pass
    return None, DEFAULT_OLLAMA_TEXT_MODEL


def format_fallback_visual_context(context: str) -> str:
    """Convert raw diagnostic BLIP key-values into a natural human sentence when LLM is offline."""
    if "Detected main subject:" in context:
        subject = ""
        setting = ""
        note = ""
        for part in context.split(". "):
            part = part.strip()
            if part.startswith("Detected main subject:"):
                subject = part.replace("Detected main subject:", "").strip()
            elif part.startswith("Detected setting or style:"):
                setting = part.replace("Detected setting or style:", "").strip()
            elif part.startswith("Direct visual answer:"):
                setting = part.replace("Direct visual answer:", "").strip()
            elif "Note:" in part or "unclear" in part or "blurry" in part:
                note = part.replace("Note:", "").strip()

        sentence_parts = []
        if subject:
            sentence_parts.append(f"The main subject appears to be {subject}")
        if setting:
            sentence_parts.append(f"({setting})")

        res = " ".join(sentence_parts) + "." if sentence_parts else context
        if note:
            res += f" Note: {note}"
        return res
    return context


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
        """Auto-enhance image clarity, contrast, and sharpness before visual analysis."""
        from PIL import ImageOps, ImageFilter, ImageEnhance, ImageStat

        # Generate preprocessed & enhanced image for EasyOCR / BLIP
        processed = image.copy().convert("RGB")
        w, h = processed.size
        
        # 1. Resize optimized for ultra-fast VQA / OCR (~5s ChatGPT speed)
        max_dim = 800
        if max(w, h) > max_dim:
            processed.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        elif max(w, h) < 300:
            processed = processed.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
            
        # 2. Auto-Contrast normalization
        processed = ImageOps.autocontrast(processed, cutoff=1)

        # 3. Brightness adjustment if dark
        gray = processed.convert("L")
        stat = ImageStat.Stat(gray)
        mean_brightness = stat.mean[0]
        if mean_brightness < 60:
            enhancer = ImageEnhance.Brightness(processed)
            processed = enhancer.enhance(1.35)
        elif mean_brightness > 210:
            enhancer = ImageEnhance.Brightness(processed)
            processed = enhancer.enhance(0.85)

        # 4. Sharpening & detail enhancement
        enhancer = ImageEnhance.Sharpness(processed)
        processed = enhancer.enhance(1.4)
        processed = processed.filter(ImageFilter.SHARPEN)

        return processed, "enhanced"


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
        rgb_image: Image.Image | None,
        instruction: str | None = None,
        history: list[ChatTurn] | None = None,
        extra_text_context: str = "",
        prompt: str | None = None,
    ) -> str:
        """Process an uploaded image/document/video/file and answer the instruction."""
        start_time = time.time()
        instruction = (prompt or instruction or DEFAULT_PROMPT).strip()

        # Handle text-only inputs or non-image document files (PDF, Word, Excel, PPT, Text, Code)
        if rgb_image is None:
            if not history and not extra_text_context:
                self.active_image = None
                if hasattr(self, "_clear_cache"):
                    self._clear_cache()
                if instruction.lower() in {"describe", "describe this image", "describe image", DEFAULT_PROMPT.lower()}:
                    raise ValueError("No active image in session. Please upload an image first.")

            if extra_text_context:
                context = f"Document / File Content extracted from upload:\n{extra_text_context}"
            else:
                context = f"Direct User Text Input:\n{instruction}"
            return self._write_chat_response(instruction, context, history or [], is_document=True)


        # Scoping & Invalidation
        active_img = getattr(self, "active_image", None)
        if rgb_image is not None:
            if rgb_image is not active_img:
                self.active_image = rgb_image
                if hasattr(self, "_clear_cache"):
                    self._clear_cache()

        elif not history:
            # Active image is cleared / new session started
            self.active_image = None
            if hasattr(self, "_clear_cache"):
                self._clear_cache()
            if not extra_text_context:
                raise ValueError("No active image or file in session. Please upload a file first.")
        elif active_img is None and not extra_text_context:
            raise ValueError("No active image or file in session. Please upload a file first.")



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

        # 3. Always run and check OCR text if text is detected in image
        ocr_start = time.time()
        if self.cached_ocr_text is None:
            self.cached_ocr_text = self._extract_text_ocr(self.cached_processed_image)
        ocr_text = self.cached_ocr_text
        ocr_duration = time.time() - ocr_start

        if ocr_text and len(ocr_text.strip()) > 35:
            wants_text = True

        # ── Route 1: Try Direct Multimodal VLM via /api/chat if vision model is installed ───
        vision_model, text_model = get_installed_ollama_models()
        if vision_model:
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
                        "model": vision_model,
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
                print(f"[Ollama Chat Error] Falling back to local BLIP + Qwen text pipeline: {e}")
                pass

        # ── Route 2: Local BLIP Visual Extraction + Installed Local Qwen Text LLM ───
        self._load_blip_fallback()
        
        if wants_text:
            if not ocr_text:
                if self.cached_ocr_text is None:
                    self.cached_ocr_text = self._extract_text_ocr(self.cached_processed_image)
                ocr_text = self.cached_ocr_text
            if ocr_text:
                context = f"Text/Writing extracted from image via OCR:\n{ocr_text}"
                answer = self._write_chat_response(instruction, context, history or [], is_document=True)
            else:
                # Fallback to combined visual context if OCR finds no text
                if self.cached_blip_context is None:
                    self.cached_blip_context = self._get_visual_context(self.cached_processed_image, instruction)
                answer = self._write_chat_response(instruction, self.cached_blip_context, history or [])
        else:
            # On follow-up questions or detail requests, query fresh visual context for the prompt
            if history or any(kw in instruction.lower() for kw in ["detail", "more", "describe", "feature", "color", "model", "explain", "specs"]):
                visual_context = self._get_visual_context(self.cached_processed_image, instruction)
            else:
                if self.cached_blip_context is None:
                    self.cached_blip_context = self._get_visual_context(self.cached_processed_image, instruction)
                visual_context = self.cached_blip_context

            combined_context = visual_context
            if self.cached_ocr_text is None:
                self.cached_ocr_text = self._extract_text_ocr(self.cached_processed_image)
            if self.cached_ocr_text:
                combined_context += f"\n\n[Extracted Text / OCR / Equations / Bill details]:\n{self.cached_ocr_text}"
            if extra_text_context:
                combined_context += f"\n\n[File / Video / Document Context]:\n{extra_text_context}"

            answer = self._write_chat_response(instruction, combined_context, history or [])


            
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
        """Build reliable visual context without forcing false domain labels or hallucinations."""
        lower_prompt = instruction.lower()

        is_logo_query = any(k in lower_prompt for k in ["logo", "brand", "company", "emblem", "icon", "symbol", "app"])
        is_vehicle_query = any(k in lower_prompt for k in ["car", "vehicle", "truck", "bike", "auto", "model", "drive", "porsche"])

        scene_answer = self._answer_question(image, "What is shown in this image and what is the room or setting?")
        items_answer = self._answer_question(image, "What items, objects, evidence markers, weapons, or people are on the floor, ground, or background?")
        details_answer = self._answer_question(image, "What notable colors, markings, stains, numbers, or visual features are visible?")
        direct_answer = self._answer_question(image, instruction)

        visual_context_parts = [
            f"Overall scene & setting: {scene_answer}.",
            f"Direct answer to prompt '{instruction}': {direct_answer}.",
            f"Visible items, objects & evidence: {items_answer}.",
            f"Visual details & markings: {details_answer}."
        ]

        if is_logo_query:
            brand_clue = self._answer_question(image, "What company, brand, app, software, or entity logo is depicted?")
            visual_context_parts.append(f"Brand/Logo clue: {brand_clue}.")

        if is_vehicle_query:
            vehicle_clue = self._answer_question(image, "What make, model, or type of vehicle is visible?")
            visual_context_parts.append(f"Vehicle details clue: {vehicle_clue}.")

        return " ".join(visual_context_parts)


    # ── LLM response ──────────────────────────────────────────────────────────

    @staticmethod
    def _write_chat_response(
        instruction: str,
        visual_context: str,
        history: list[ChatTurn],
        is_document: bool = False,
    ) -> str:
        """Use the already-installed local Qwen model for a natural, fast response (~5s ChatGPT speed)."""
        is_performance_request = any(
            kw in instruction.lower()
            for kw in ["perform", "act", "script", "recite", "monologue", "dialogue", "roleplay"]
        )

        if is_performance_request:
            history_text = "No earlier conversation."
        else:
            recent_turns = history[-8:]
            history_text = "\n".join(
                f"{turn['role'].title()}: {turn['content']}" for turn in recent_turns
            ) or "No earlier conversation."

        prompt = f"""You are a universal local AI assistant capable of visual analysis, document processing, and authentic character performance:
- Scripts, Acting & Performance: When given a script, dialogue, monologue, or acting document (or when asked to "perform the script"), DO NOT write a summary, analysis, or meta-explanation like "Based on the provided script...". Instead, ACT AND PERFORM THE SCRIPT DIRECTLY character-by-character, line-by-line with full emotional delivery, stage directions, and vocal tone exactly as written in the script!
- Documents, Bills & Text: Transcribe, analyze, or answer questions about uploaded documents, bills, or handwritten notes.
- Visual & Scene Analysis: Identify objects, settings, logos, vehicles, crime scene evidence, medical symptoms, or math equations accurately based strictly on visual evidence.

CRITICAL RULE FOR SCRIPT PERFORMANCE:
If the user asks to "perform", "read", "act out", or provides a script (e.g. FRIDAY Emotion Test or monologue), PERFORM THE EXACT SCRIPT PROVIDED IN THE CURRENT USER REQUEST BELOW. Recite the exact character lines, emotions, and stage directions. NEVER repeat, quote, or reuse any script lines or sentences from previous turns in the conversation history!

Previous conversation history:
{history_text}

Current user request: {instruction}
Visual & textual evidence from local image models:
{visual_context}

Answer:"""




        vision_model, text_model = get_installed_ollama_models()

        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": text_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 750, "temperature": 0.2}
                },
                timeout=120,
            )
            response.raise_for_status()
            answer = response.json().get("response", "").strip()
            if answer:
                return answer
        except requests.RequestException:
            pass
        return format_fallback_visual_context(visual_context)




@lru_cache(maxsize=1)
def get_vision_assistant() -> LocalVisionAssistant:
    """Create one shared model instance instead of loading it for every request."""
    return LocalVisionAssistant()
