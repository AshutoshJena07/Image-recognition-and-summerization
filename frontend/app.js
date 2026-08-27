const form = document.querySelector('#prompt-form');
const promptInput = document.querySelector('#prompt-input');
const imageInput = document.querySelector('#image-input');
const attachButton = document.querySelector('#attach-button');
const sendButton = document.querySelector('#send-button');
const conversation = document.querySelector('#conversation');
const welcome = document.querySelector('#welcome');
const preview = document.querySelector('#preview');
const previewImage = document.querySelector('#preview-image');
const previewName = document.querySelector('#preview-name');
const removeImage = document.querySelector('#remove-image');
let selectedImage = null;
let selectedImageUrl = '';
const chatHistory = [];
let imageUploaded = false;
let hasActiveImageOnBackend = false;

function resizeTextarea() {
  promptInput.style.height = 'auto';
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 150)}px`;
}

function updateSendState() {
  const hasPrompt = Boolean(promptInput.value.trim());
  const hasImage = Boolean(selectedImage) || hasActiveImageOnBackend;
  sendButton.disabled = !hasImage && !hasPrompt;
}

function setImage(file) {
  if (!file) return;
  const replacingImage = Boolean(selectedImage) || hasActiveImageOnBackend;
  selectedImage = file;
  imageUploaded = false;
  hasActiveImageOnBackend = false;

  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);

  const ext = file.name.split('.').pop().toLowerCase();
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'].includes(ext);

  if (isImage) {
    selectedImageUrl = URL.createObjectURL(file);
    previewImage.src = selectedImageUrl;
    previewImage.style.display = 'block';
  } else {
    selectedImageUrl = '';
    previewImage.style.display = 'none';
  }

  const iconMap = {
    pdf: '📄 PDF Document',
    doc: '📝 Word Document',
    docx: '📝 Word Document',
    ppt: '📽️ Presentation',
    pptx: '📽️ Presentation',
    xls: '📊 Excel Sheet',
    xlsx: '📊 Excel Sheet',
    csv: '📊 CSV Table',
    mp4: '🎥 Video File',
    avi: '🎥 Video File',
    mov: '🎥 Video File',
    mkv: '🎥 Video File',
    txt: '📝 Text File',
    json: '💻 JSON File',
    py: '🐍 Python File',
    js: '💻 JS File',
    html: '🌐 HTML File',
    css: '🎨 CSS File'
  };

  const fileLabel = iconMap[ext] || `📎 ${file.name}`;
  previewName.textContent = isImage ? file.name : `${fileLabel} (${file.name})`;
  preview.classList.remove('hidden');
  if (replacingImage) {
    chatHistory.length = 0;
  }
  updateSendState();
}



function clearImage() {
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImage = null;
  selectedImageUrl = '';
  imageInput.value = '';
  preview.classList.add('hidden');
  chatHistory.length = 0;
  imageUploaded = false;
  hasActiveImageOnBackend = false;
  updateSendState();
}

// Text sanitization for clean, natural speech pronunciation
function sanitizeTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Code section omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[[A-Za-z0-9_\s\/\\-]+\]/g, '')
    .replace(/^[A-Za-z0-9_\s]+\s*(\([^)]*\))?\s*:\s*/gm, '')
    .replace(/\*?\([^)]*\)\*?/g, '')
    .replace(/[*_~#>-]+/g, ' ')
    .replace(/\bDr\./gi, 'Doctor')
    .replace(/\bMr\./gi, 'Mister')
    .replace(/\bMrs\./gi, 'Missus')
    .replace(/\bMs\./gi, 'Miss')
    .replace(/\be\.g\./gi, 'for example,')
    .replace(/\bi\.e\./gi, 'that is,')
    .replace(/\bvs\./gi, 'versus')
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent ')
    .replace(/#/g, ' number ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Browser Web Speech API Synthesizer (Emotional & Expressive Female Voice)
const voiceSynthesizer = {
  autoSpeak: localStorage.getItem('auto_speak') === 'true',
  currentButton: null,

  init() {
    const toggleBtn = document.querySelector('#auto-speak-toggle');
    if (toggleBtn) {
      if (this.autoSpeak) {
        toggleBtn.classList.add('active');
        toggleBtn.setAttribute('aria-pressed', 'true');
      }
      toggleBtn.addEventListener('click', () => {
        this.autoSpeak = !this.autoSpeak;
        localStorage.setItem('auto_speak', String(this.autoSpeak));
        toggleBtn.classList.toggle('active', this.autoSpeak);
        toggleBtn.setAttribute('aria-pressed', String(this.autoSpeak));
        if (!this.autoSpeak) this.stop();
      });
    }
  },

  currentAudio: null,

  async speak(text, buttonEl = null) {
    if (this.currentButton === buttonEl && (this.currentAudio || (window.speechSynthesis && window.speechSynthesis.speaking))) {
      this.stop();
      return;
    }
    this.stop();

    const cleanText = sanitizeTextForSpeech(text);
    if (!cleanText) return;

    if (buttonEl) {
      this.currentButton = buttonEl;
      buttonEl.classList.add('speaking');
      buttonEl.title = 'Stop Reading';
    }

    try {
      const response = await fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });

      if (!response.ok) throw new Error('Cartesia AI TTS request failed');

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        if (buttonEl) {
          buttonEl.classList.remove('speaking');
          buttonEl.title = 'Read Aloud';
        }
        this.currentButton = null;
        this.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        this.fallbackWebSpeech(cleanText, buttonEl);
      };

      await audio.play();
    } catch (err) {
      console.warn('Cartesia TTS failed, falling back to Web Speech API:', err);
      this.fallbackWebSpeech(cleanText, buttonEl);
    }
  },

  fallbackWebSpeech(cleanText, buttonEl) {
    const rawSentences = cleanText.split(/(?<=[.!?;\n])\s+/).map(s => s.trim()).filter(Boolean);
    const sentences = rawSentences.length > 0 ? rawSentences : [cleanText];

    const voices = window.speechSynthesis.getVoices();
    const bestFemaleVoice = 
      voices.find(v => (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja') || v.name.includes('Emma')) && v.name.includes('Natural')) ||
      voices.find(v => v.name.toLowerCase().includes('friday')) ||
      voices.find(v => v.name.includes('Zira') || v.name.includes('Heera') || v.name.includes('Swara')) ||
      voices.find(v => v.name.toLowerCase().includes('female') && (v.name.includes('Natural') || v.name.includes('Neural'))) ||
      voices.find(v => (v.lang.startsWith('en') || v.lang.startsWith('hi')) && (v.name.includes('Natural') || v.name.includes('Neural'))) ||
      voices.find(v => v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.name.toLowerCase().includes('zira')) ||
      voices.find(v => v.lang.startsWith('en')) || voices[0];

    let currentIndex = 0;
    
    // Keep-alive timer to prevent Chrome from auto-pausing long speech
    if (this._speechTimer) clearInterval(this._speechTimer);
    this._speechTimer = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        if (this._speechTimer) { clearInterval(this._speechTimer); this._speechTimer = null; }
      }
    }, 10000);

    const playNextSentence = () => {
      if (currentIndex >= sentences.length) {
        if (this._speechTimer) { clearInterval(this._speechTimer); this._speechTimer = null; }
        if (buttonEl) {
          buttonEl.classList.remove('speaking');
          buttonEl.title = 'Read Aloud';
        }
        this.currentButton = null;
        return;
      }

      const sentence = sentences[currentIndex].trim();
      if (!sentence) {
        currentIndex++;
        playNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);
      if (bestFemaleVoice) utterance.voice = bestFemaleVoice;

      utterance.pitch = 1.08;
      utterance.rate = 0.98;

      utterance.onend = () => {
        currentIndex++;
        playNextSentence();
      };

      utterance.onerror = () => {
        if (this._speechTimer) { clearInterval(this._speechTimer); this._speechTimer = null; }
        if (buttonEl) {
          buttonEl.classList.remove('speaking');
          buttonEl.title = 'Read Aloud';
        }
        this.currentButton = null;
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextSentence();
  },

  stop() {
    if (this._speechTimer) {
      clearInterval(this._speechTimer);
      this._speechTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentButton) {
      this.currentButton.classList.remove('speaking');
      this.currentButton.title = 'Read Aloud';
      this.currentButton = null;
    }
  }
};



voiceSynthesizer.init();

// Copy text to clipboard helper with robust fallback
async function copyToClipboard(text, buttonEl) {
  if (!text) return;
  let copied = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn('Navigator clipboard write failed, attempting execCommand fallback:', err);
  }

  if (!copied) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.error('Copy fallback failed:', e);
    }
  }

  if (copied && buttonEl) {
    const origText = buttonEl.textContent;
    const origTitle = buttonEl.title;
    buttonEl.textContent = '✓';
    buttonEl.title = 'Copied!';
    buttonEl.classList.add('copied');
    setTimeout(() => {
      buttonEl.textContent = origText;
      buttonEl.title = origTitle;
      buttonEl.classList.remove('copied');
    }, 2000);
  }
}

function addMessage({ role, text, imageUrl = null, fileBadge = null, typing = false, error = false }) {
  welcome?.remove();
  const message = document.createElement('article');
  message.className = 'message';
  const isBot = role === 'bot';
  
  message.innerHTML = `
    <div class="avatar ${role}">${isBot ? '✦' : 'U'}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-title">${isBot ? 'Assistant' : 'You'}</span>
        ${isBot && !typing ? `
          <div class="message-actions">
            <button class="action-btn speech-btn" title="Read Aloud" type="button" aria-label="Read response aloud">🔊</button>
            <button class="action-btn copy-btn" title="Copy Response" type="button" aria-label="Copy response text">📋</button>
          </div>` : ''}
      </div>
      ${fileBadge ? `<div class="user-file-badge">${fileBadge}</div>` : ''}
      ${imageUrl ? `<img class="user-image" src="${imageUrl}" alt="Uploaded image" />` : ''}
      <div class="${typing ? 'typing' : `answer${error ? ' error' : ''}`}">${typing ? '<span></span><span></span><span></span>' : ''}</div>
    </div>`;
    
  if (!typing && text) {
    message.querySelector('.answer').textContent = text;
    const speechBtn = message.querySelector('.speech-btn');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => voiceSynthesizer.speak(text, speechBtn));
    }
    const copyBtn = message.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));
    }
  }
  
  conversation.append(message);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return message;
}


document.addEventListener('paste', (event) => {
  const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        const ext = file.type ? file.type.split('/')[1] || 'bin' : 'file';
        const fileName = file.name && file.name !== 'image.png' ? file.name : `pasted_file_${Date.now()}.${ext}`;
        const pastedFile = new File([file], fileName, { type: file.type || 'application/octet-stream' });
        setImage(pastedFile);
        break;
      }
    }
  }
});

// Drag and Drop File Upload Support
['dragenter', 'dragover'].forEach((eventName) => {
  document.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

['dragleave', 'drop'].forEach((eventName) => {
  document.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    setImage(files[0]);
  }
});

attachButton.addEventListener('click', () => {
  imageInput.value = '';
  imageInput.click();
});
imageInput.addEventListener('change', (event) => {
  if (event.target.files && event.target.files[0]) {
    setImage(event.target.files[0]);
  }
});
removeImage.addEventListener('click', clearImage);
promptInput.addEventListener('input', () => { resizeTextarea(); updateSendState(); });
promptInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!sendButton.disabled) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  }
});

conversation.addEventListener('click', (event) => {
  const suggestionBtn = event.target.closest('.suggestion');
  if (suggestionBtn) {
    promptInput.value = suggestionBtn.textContent.trim();
    resizeTextarea();
    updateSendState();
    promptInput.focus();
  }
});

document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => {
  promptInput.value = button.textContent.trim();
  resizeTextarea(); updateSendState(); promptInput.focus();
}));


form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const prompt = promptInput.value.trim() || 'Analyze this file and summarize its key content and details.';
  

  
  const data = new FormData();
  if (selectedImage && !imageUploaded) {
    data.append('file', selectedImage);
    data.append('image', selectedImage);
  }
  data.append('prompt', prompt);
  data.append('history', JSON.stringify(chatHistory.slice(-8)));
  
  const fileUrl = (selectedImage && !imageUploaded && selectedImageUrl) ? selectedImageUrl : null;
  const fileBadge = (selectedImage && !imageUploaded) ? previewName.textContent : null;

  addMessage({ role: 'user', text: prompt, imageUrl: fileUrl, fileBadge: fileBadge });
  chatHistory.push({ role: 'user', content: prompt });
  
  // Hide bottom composer preview bar on submit so message bubble displays attachment
  if (selectedImage) {
    imageUploaded = true;
    preview.classList.add('hidden');
  }

  // Cancel any currently playing speech when a new query is submitted
  voiceSynthesizer.stop();

  const pending = addMessage({ role: 'bot', typing: true });
  promptInput.value = ''; resizeTextarea(); updateSendState();

  
  try {
    const response = await fetch('/analyze', { method: 'POST', body: data });
    let result = null;
    try {
      result = await response.json();
    } catch {
      // response body wasn't JSON
    }
    if (!response.ok) {
      throw new Error(result?.detail || `Server error (${response.status}): Failed to analyze image.`);
    }
    
    // Replace typing indicator with final answer content and action buttons
    const messageHeader = pending.querySelector('.message-header');
    if (messageHeader && !messageHeader.querySelector('.message-actions')) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      
      const speechBtn = document.createElement('button');
      speechBtn.className = 'action-btn speech-btn';
      speechBtn.title = 'Read Aloud';
      speechBtn.type = 'button';
      speechBtn.setAttribute('aria-label', 'Read response aloud');
      speechBtn.textContent = '🔊';
      speechBtn.addEventListener('click', () => voiceSynthesizer.speak(result.answer, speechBtn));
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn copy-btn';
      copyBtn.title = 'Copy Response';
      copyBtn.type = 'button';
      copyBtn.setAttribute('aria-label', 'Copy response text');
      copyBtn.textContent = '📋';
      copyBtn.addEventListener('click', () => copyToClipboard(result.answer, copyBtn));

      actionsDiv.append(speechBtn, copyBtn);
      messageHeader.append(actionsDiv);
    }

    
    pending.querySelector('.typing').replaceWith(Object.assign(document.createElement('div'), { className: 'answer', textContent: result.answer }));
    chatHistory.push({ role: 'assistant', content: result.answer });
    
    imageUploaded = true;
    hasActiveImageOnBackend = true;
    updateSendState();

    // Auto-Speak if enabled
    if (voiceSynthesizer.autoSpeak && result.answer) {
      const activeSpeechBtn = pending.querySelector('.speech-btn');
      voiceSynthesizer.speak(result.answer, activeSpeechBtn);
    }
  } catch (error) {
    let errorMessage = error.message;
    if (window.location.protocol === 'file:') {
      errorMessage = 'Please open http://127.0.0.1:8000 in your browser instead of opening index.html directly as a file.';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to server. Please make sure the backend is running at http://127.0.0.1:8000.';
    }
    pending.querySelector('.typing').replaceWith(Object.assign(document.createElement('div'), { className: 'answer error', textContent: errorMessage }));
  }
});


// Simulated upload helpers for E2E browser automation
window.addEventListener('keydown', async (event) => {
  if (event.altKey && event.key.toLowerCase() === 'u') {
    event.preventDefault();
    try {
      const response = await fetch('/assets/normal_scene.png');
      const blob = await response.blob();
      const file = new File([blob], 'normal_scene.png', { type: 'image/png' });
      setImage(file);
      console.log('Simulated upload of normal_scene.png');
    } catch (err) {
      console.error('Failed to simulate upload of normal_scene.png:', err);
    }
  } else if (event.altKey && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    try {
      const response = await fetch('/assets/blurry_image.png');
      const blob = await response.blob();
      const file = new File([blob], 'blurry_image.png', { type: 'image/png' });
      setImage(file);
      console.log('Simulated upload of blurry_image.png');
    } catch (err) {
      console.error('Failed to simulate upload of blurry_image.png:', err);
    }
  }
});
