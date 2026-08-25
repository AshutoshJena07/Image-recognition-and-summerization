from src.image_analytics.vision_assistant import DEFAULT_PROMPT


def test_default_prompt_is_available() -> None:
    assert "Describe" in DEFAULT_PROMPT
