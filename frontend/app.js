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

function resizeTextarea() {
  promptInput.style.height = 'auto';
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 150)}px`;
}

function updateSendState() {
  sendButton.disabled = !selectedImage || !promptInput.value.trim();
}

function setImage(file) {
  if (!file) return;
  const replacingImage = Boolean(selectedImage);
  selectedImage = file;
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = URL.createObjectURL(file);
  previewImage.src = selectedImageUrl;
  previewName.textContent = file.name;
  preview.classList.remove('hidden');
  if (replacingImage) {
    chatHistory.length = 0;
    addMessage({ role: 'bot', text: 'New image selected. Ask me anything about this image.' });
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
  updateSendState();
}

function addMessage({ role, text, imageUrl = null, typing = false, error = false }) {
  welcome?.remove();
  const message = document.createElement('article');
  message.className = 'message';
  message.innerHTML = `
    <div class="avatar ${role}">${role === 'bot' ? '✦' : 'U'}</div>
    <div class="message-content">
      <div class="message-title">${role === 'bot' ? 'Assistant' : 'You'}</div>
      ${imageUrl ? `<img class="user-image" src="${imageUrl}" alt="Uploaded image" />` : ''}
      <div class="${typing ? 'typing' : `answer${error ? ' error' : ''}`}">${typing ? '<span></span><span></span><span></span>' : ''}</div>
    </div>`;
  if (!typing) message.querySelector('.answer').textContent = text;
  conversation.append(message);
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return message;
}

attachButton.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (event) => setImage(event.target.files[0]));
removeImage.addEventListener('click', clearImage);
promptInput.addEventListener('input', () => { resizeTextarea(); updateSendState(); });
document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => {
  promptInput.value = button.textContent;
  resizeTextarea(); updateSendState(); promptInput.focus();
}));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedImage || !promptInput.value.trim()) return;
  const prompt = promptInput.value.trim();
  const fileUrl = selectedImageUrl;
  const data = new FormData();
  data.append('image', selectedImage);
  data.append('prompt', prompt);
  data.append('history', JSON.stringify(chatHistory.slice(-8)));
  addMessage({ role: 'user', text: prompt, imageUrl: fileUrl });
  chatHistory.push({ role: 'user', content: prompt });
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
    pending.querySelector('.typing').replaceWith(Object.assign(document.createElement('div'), { className: 'answer', textContent: result.answer }));
    chatHistory.push({ role: 'assistant', content: result.answer });
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
