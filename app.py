"""Temporary local demo UI. The main backend is src.image_analytics.api."""

from __future__ import annotations

import streamlit as st
from PIL import Image

from src.image_analytics.vision_assistant import DEFAULT_PROMPT, get_vision_assistant

st.set_page_config(page_title="Local Image Assistant", page_icon="🖼️")
st.title("Local Image Assistant")
st.caption("Upload an image and ask what you want to know. No API key is required.")

uploaded = st.file_uploader("Upload an image", type=["jpg", "jpeg", "png", "webp"])
prompt = st.text_area("Your instruction", value=DEFAULT_PROMPT, height=100)

if uploaded and st.button("Analyse image", type="primary"):
    image = Image.open(uploaded).convert("RGB")
    st.image(image, caption=uploaded.name, use_container_width=True)
    with st.spinner("Loading local model and analysing the image…"):
        answer = get_vision_assistant().answer(image, prompt)
    st.subheader("AI response")
    st.write(answer)
