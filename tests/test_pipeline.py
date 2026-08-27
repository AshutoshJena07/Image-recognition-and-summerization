from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from io import BytesIO

# Import the app to test
from src.image_analytics.api import app
from src.image_analytics.vision_assistant import LocalVisionAssistant, DEFAULT_PROMPT

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model": "loaded on first analysis request"}

def test_image_validation():
    # Test valid image type image/jpeg
    with patch("src.image_analytics.api.get_vision_assistant") as mock_get:
        mock_assistant = MagicMock()
        mock_assistant.answer.return_value = "Mocked answer"
        mock_get.return_value = mock_assistant

        img_byte_arr = BytesIO()
        Image.new('RGB', (100, 100)).save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        response = client.post(
            "/analyze",
            files={"image": ("test.jpg", img_byte_arr, "image/jpeg")},
            data={"prompt": "Describe this image", "history": "[]"}
        )
        assert response.status_code == 200
        assert "answer" in response.json()
        assert response.json()["answer"] == "Mocked answer"

def test_invalid_image_type():
    # Test invalid image type (e.g. image/gif)
    img_byte_arr = BytesIO()
    Image.new('RGB', (100, 100)).save(img_byte_arr, format='GIF')
    img_byte_arr.seek(0)

    response = client.post(
        "/analyze",
        files={"image": ("test.gif", img_byte_arr, "image/gif")},
        data={"prompt": "Describe this image", "history": "[]"}
    )
    assert response.status_code == 415
    assert "detail" in response.json()

def test_supported_image_types():
    # Test all supported content types: image/jpeg, image/jpg, image/png, image/webp, image/pjpeg
    supported_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/pjpeg"]
    
    with patch("src.image_analytics.api.get_vision_assistant") as mock_get:
        mock_assistant = MagicMock()
        mock_assistant.answer.return_value = "Mocked response"
        mock_get.return_value = mock_assistant

        for content_type in supported_types:
            img_byte_arr = BytesIO()
            fmt = "PNG" if "png" in content_type else "WEBP" if "webp" in content_type else "JPEG"
            Image.new('RGB', (10, 10)).save(img_byte_arr, format=fmt)
            img_byte_arr.seek(0)

            response = client.post(
                "/analyze",
                files={"image": (f"test.{fmt.lower()}", img_byte_arr, content_type)},
                data={"prompt": "", "history": "[]"}
            )
            assert response.status_code == 200, f"Failed for content type: {content_type}"

import requests

def test_ocr_routing_wants_text():
    # Test routing logic where wants_text is True (contains document/ocr keywords)
    img = Image.new('RGB', (10, 10))
    
    # We patch requests.post, _load_blip_fallback, _extract_text_ocr, _get_visual_context, and _write_chat_response
    with patch("requests.post", side_effect=requests.RequestException("Ollama down")), \
         patch.object(LocalVisionAssistant, "_load_blip_fallback"), \
         patch.object(LocalVisionAssistant, "_extract_text_ocr", return_value="Some OCR Text"), \
         patch.object(LocalVisionAssistant, "_get_visual_context") as mock_get_visual, \
         patch.object(LocalVisionAssistant, "_write_chat_response", return_value="Routed to OCR") as mock_write:
        
        real_assistant = LocalVisionAssistant.__new__(LocalVisionAssistant)
        # Call answer
        result = real_assistant.answer(img, prompt="Read this text")
        
        # Should call OCR text extractor, but NOT call get_visual_context (BLIP)
        assert mock_get_visual.call_count == 0
        mock_write.assert_called_once_with(
            "Read this text", 
            "Text/Writing extracted from image via OCR:\nSome OCR Text",
            [],
            is_document=True
        )
        assert result == "Routed to OCR"

def test_ocr_routing_normal_image():
    # Test routing logic where wants_text is False, but text is present
    img = Image.new('RGB', (10, 10))
    
    with patch("requests.post", side_effect=requests.RequestException("Ollama down")), \
         patch.object(LocalVisionAssistant, "_load_blip_fallback"), \
         patch.object(LocalVisionAssistant, "_extract_text_ocr", return_value="Some OCR Text"), \
         patch.object(LocalVisionAssistant, "_get_visual_context", return_value="BLIP visual info") as mock_get_visual, \
         patch.object(LocalVisionAssistant, "_write_chat_response", return_value="Routed to BLIP+OCR") as mock_write:
        
        real_assistant = LocalVisionAssistant.__new__(LocalVisionAssistant)
        result = real_assistant.answer(img, prompt="Describe the scene")
        
        # Should call get_visual_context
        mock_get_visual.assert_called_once()
        assert mock_get_visual.call_args[0][1] == "Describe the scene"
        mock_write.assert_called_once()
        assert mock_write.call_args[0][0] == "Describe the scene"
        assert "BLIP visual info" in mock_write.call_args[0][1]
        assert result == "Routed to BLIP+OCR"

def test_ocr_routing_normal_image_no_text():
    # Test routing logic where wants_text is False, and no text is present
    img = Image.new('RGB', (10, 10))
    
    with patch("requests.post", side_effect=requests.RequestException("Ollama down")), \
         patch.object(LocalVisionAssistant, "_load_blip_fallback"), \
         patch.object(LocalVisionAssistant, "_extract_text_ocr", return_value=""), \
         patch.object(LocalVisionAssistant, "_get_visual_context", return_value="BLIP visual info") as mock_get_visual, \
         patch.object(LocalVisionAssistant, "_write_chat_response", return_value="Routed to BLIP only") as mock_write:
        
        real_assistant = LocalVisionAssistant.__new__(LocalVisionAssistant)
        result = real_assistant.answer(img, prompt="Describe the scene")
        
        mock_get_visual.assert_called_once()
        assert mock_get_visual.call_args[0][1] == "Describe the scene"
        mock_write.assert_called_once()
        assert mock_write.call_args[0][0] == "Describe the scene"
        assert "BLIP visual info" in mock_write.call_args[0][1]
        assert result == "Routed to BLIP only"


def test_analyze_endpoint_reuses_cached_image():
    # Test that calling /analyze with an image caches it, and then calling it without an image reuses it.
    with patch("src.image_analytics.api.get_vision_assistant") as mock_get:
        mock_assistant = MagicMock(spec=LocalVisionAssistant)
        mock_assistant.answer.side_effect = lambda img, prompt, hist: f"Answer for prompt '{prompt}' (img: {img is not None})"
        mock_get.return_value = mock_assistant

        img_byte_arr = BytesIO()
        Image.new('RGB', (10, 10)).save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        # 1. First request with image
        response1 = client.post(
            "/analyze",
            files={"image": ("test.jpg", img_byte_arr, "image/jpeg")},
            data={"prompt": "First prompt", "history": "[]"}
        )
        assert response1.status_code == 200
        assert response1.json()["answer"] == "Answer for prompt 'First prompt' (img: True)"

        # 2. Second request without image (follow-up)
        response2 = client.post(
            "/analyze",
            data={"prompt": "Follow-up prompt", "history": "[]"}
        )
        assert response2.status_code == 200
        assert response2.json()["answer"] == "Answer for prompt 'Follow-up prompt' (img: False)"


def test_analyze_endpoint_no_cached_image_error():
    # Test that calling /analyze without an image when no image is cached raises ValueError (which maps to 400)
    with patch("src.image_analytics.api.get_vision_assistant") as mock_get:
        mock_assistant = MagicMock(spec=LocalVisionAssistant)
        # Mock answer to raise ValueError if no image is active
        mock_assistant.answer.side_effect = ValueError("No active image in session. Please upload an image first.")
        mock_get.return_value = mock_assistant

        response = client.post(
            "/analyze",
            data={"prompt": "Describe image", "history": "[]"}
        )
        assert response.status_code == 400
        assert "No active image in session" in response.json()["detail"]


def test_clarity_check_uncertainty_injection():
    # Test that clarity check returns 'blurry' and adds uncertainty instruction
    img = Image.new('RGB', (10, 10))
    
    with patch("requests.post", side_effect=requests.RequestException("Ollama down")), \
         patch.object(LocalVisionAssistant, "_load_blip_fallback"), \
         patch.object(LocalVisionAssistant, "_extract_text_ocr", return_value=""), \
         patch.object(LocalVisionAssistant, "_answer_question") as mock_ans, \
         patch.object(LocalVisionAssistant, "_write_chat_response", return_value="Uncertain answer") as mock_write:
        
        # mock_ans is called for:
        # 1. object_answer: "What is the main object or scene in this image?"
        # 2. is_blurry: "Is this image blurry?"
        # 3. is_dark: "Is this image dark?"
        # 4. answer: "Describe the scene"
        def side_effect(image, question):
            if "main object" in question:
                return "some object"
            elif "blurry" in question:
                return "yes"
            elif "dark" in question:
                return "yes"
            else:
                return "direct answer"
        mock_ans.side_effect = side_effect
        
        real_assistant = LocalVisionAssistant.__new__(LocalVisionAssistant)
        result = real_assistant.answer(img, prompt="Describe the scene")
        
        # Verify clarity check was included in visual context
        assert "Note: The image quality is low or the visual evidence is unclear/blurry." in mock_write.call_args[0][1]
        
        # Verify that write_chat_response was called
        mock_write.assert_called_once()
        assert result == "Uncertain answer"

def test_qwen_multimodal_success():
    # Test that direct routing to Qwen multimodal works when Ollama is running
    img = Image.new('RGB', (100, 100))
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": {"role": "assistant", "content": "Mocked Qwen Multimodal Answer"}}
    
    with patch("requests.post", return_value=mock_response) as mock_post:
        assistant = LocalVisionAssistant()
        result = assistant.answer(img, prompt="Who is Spider-Man?")
        
        assert result == "Mocked Qwen Multimodal Answer"
        mock_post.assert_called_once()
        # Verify /api/chat URL and payload
        url_arg = mock_post.call_args[0][0]
        assert "/api/chat" in url_arg
        
        payload = mock_post.call_args[1]["json"]
        assert payload["model"] == "qwen2.5vl:3b"
        assert payload["keep_alive"] == -1
        assert "messages" in payload
        # First message is system, second is user
        assert payload["messages"][0]["role"] == "system"
        assert payload["messages"][1]["role"] == "user"
        assert "images" in payload["messages"][1]
        assert len(payload["messages"][1]["images"]) == 1

def test_caching_mechanism_follow_up():
    # Test caching of quality checks, base64 images and OCR
    img = Image.new('RGB', (100, 100))
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": {"role": "assistant", "content": "Answer"}}
    
    with patch("requests.post", return_value=mock_response) as mock_post, \
         patch.object(LocalVisionAssistant, "_analyze_and_preprocess_image", return_value=(img, "clear")) as mock_analyze, \
         patch.object(LocalVisionAssistant, "_extract_text_ocr", return_value="OCR Text") as mock_ocr:
        
        assistant = LocalVisionAssistant()
        
        # First call (with image)
        assistant.answer(img, prompt="Describe this image")
        assert mock_analyze.call_count == 1
        
        # Second call (follow-up, no image)
        assistant.answer(None, prompt="What color is it?", history=[{"role": "user", "content": "Describe this image"}])
        # Should NOT call analyze again
        assert mock_analyze.call_count == 1
        
        # Third call requesting OCR (text mode)
        assistant.answer(None, prompt="Read the text", history=[{"role": "user", "content": "Describe this image"}])
        assert mock_ocr.call_count == 1
        
        # Fourth call requesting OCR (text mode) again
        assistant.answer(None, prompt="Read it again", history=[{"role": "user", "content": "Describe this image"}])
        # Should NOT call OCR again (cached!)
        assert mock_ocr.call_count == 1

def test_cache_invalidation_on_replacement():
    # Test that uploading a new image invalidates the cache
    img1 = Image.new('RGB', (100, 100))
    img2 = Image.new('RGB', (100, 100))
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": {"role": "assistant", "content": "Answer"}}
    
    with patch("requests.post", return_value=mock_response), \
         patch.object(LocalVisionAssistant, "_analyze_and_preprocess_image", return_value=(img1, "clear")) as mock_analyze:
        
        assistant = LocalVisionAssistant()
        
        # First image
        assistant.answer(img1, prompt="Describe image 1")
        assert mock_analyze.call_count == 1
        
        # Replace image with img2
        assistant.answer(img2, prompt="Describe image 2")
        # Should analyze again (invalidated!)
        assert mock_analyze.call_count == 2

def test_cache_clearing_on_new_session():
    # Test that starting a new session without an image clears cache and raises ValueError
    img = Image.new('RGB', (100, 100))
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": {"role": "assistant", "content": "Answer"}}
    
    with patch("requests.post", return_value=mock_response):
        assistant = LocalVisionAssistant()
        
        # Setup active image
        assistant.answer(img, prompt="Describe")
        assert assistant.active_image is not None
        
        # Send request with empty history and no image
        with pytest.raises(ValueError, match="No active image"):
            assistant.answer(None, prompt="Describe", history=[])
            
        # Verify active image was cleared
        assert assistant.active_image is None

