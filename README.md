# Local Image Assistant

This project is an offline-first, ChatGPT-style image assistant.

You give it **an image and a written instruction**, for example:

- “Describe this image in detail.”
- “What objects can you see?”
- “What activity is happening?”
- “Write a short caption for this image.”

It uses a local **BLIP visual-question-answering model** to extract image facts and your installed local **Qwen 2.5** model to write natural, conversational answers. There is **no OpenAI API, no external AI API, and no API key**.

The browser sends the latest eight text turns with each request, so the local Qwen model can understand follow-up questions in the same open chat session.

## Architecture

```text
Image + user prompt
        |
        v
FastAPI backend (/analyze)
        |
        v
Local BLIP VQA model + local Qwen response writer
        |
        v
Text answer for the image
```

## Project layout

```text
frontend/                      # Premium browser chat interface
  index.html                   # Image + prompt chat layout
  styles.css                   # Responsive animations and styling
  app.js                       # Upload, chat and backend connection
requirements.txt               # Python dependencies
src/image_analytics/
  api.py                       # Backend routes for future frontend
  vision_assistant.py          # Local BLIP model integration
tests/                         # Automated tests
hf_cache/                      # Downloaded model files (created automatically)
```

## Installation (Windows PowerShell)

Open PowerShell inside this project folder first:

```powershell
cd "C:\Users\adars\OneDrive\Desktop\Image Recognition & Summerization"
```

Then activate your existing environment and install dependencies:

```powershell
C:\Users\adars\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The first use of each BLIP model downloads it to `hf_cache/`. This download needs internet one time only; inference afterwards runs locally. A GPU is optional, but makes responses much faster.

## Run the backend

```powershell
python -m uvicorn src.image_analytics.api:app --reload --reload-dir src
```

The browser interface starts at `http://127.0.0.1:8000`. Interactive API documentation is also available at `http://127.0.0.1:8000/docs`.

### Test it from the API documentation

1. Open `http://127.0.0.1:8000/docs`.
2. Select `POST /analyze`, then click **Try it out**.
3. Upload an image and write a prompt.
4. Click **Execute** to get the AI response.

## Use the chat interface

1. Open `http://127.0.0.1:8000` in Chrome or Edge.
2. Click the **+** icon and choose an image.
3. Write your instruction, such as `Summarize this image in detail.`
4. Press the arrow button to receive the local AI response.

The browser interface calls `POST /analyze` with two form fields:

- `image`: the image file
- `prompt`: the user’s instruction

## Important limitation

BLIP is a compact local academic model, not a full ChatGPT-scale model. It works well for image descriptions and simple visual questions. Complex reasoning, long creative captions, and very detailed image understanding will need a stronger local model later (such as Qwen-VL or LLaVA) and preferably a capable GPU.
