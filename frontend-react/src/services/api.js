/**
 * Frontend API Service for Local Image Assistant
 */

export async function checkHealth() {
  try {
    const response = await fetch('/health');
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch (err) {
    console.warn('Backend health check failed:', err);
    return false;
  }
}

export async function analyzeFile(prompt, fileObj, history = []) {
  const data = new FormData();
  
  if (fileObj) {
    // Both file and image keys are appended for compatibility
    data.append('file', fileObj);
    data.append('image', fileObj);
  }
  
  data.append('prompt', prompt || 'Analyze this file and summarize its key content and details.');
  
  // Clean up history turns: filter out system greetings, active typing indicators, errors, and empty strings
  const cleanHistory = history
    .filter(turn => !turn.typing && !turn.error && turn.text && !turn.text.startsWith('Hello! I am your local'))
    .map(turn => ({
      role: turn.role === 'bot' ? 'assistant' : 'user',
      content: turn.text
    }));
  
  data.append('history', JSON.stringify(cleanHistory.slice(-8)));

  const response = await fetch('/analyze', {
    method: 'POST',
    body: data
  });

  let result = null;
  try {
    result = await response.json();
  } catch (err) {
    // Response body is not JSON
  }

  if (!response.ok) {
    throw new Error(result?.detail || `Server error (${response.status}): Failed to analyze file.`);
  }

  return result;
}

// User Authentication API Calls
export async function registerUser(email, password) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Registration failed');
  }
  return data;
}

export async function loginUser(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Login failed');
  }
  return data; // returns { token, email }
}

export async function logoutUser(token) {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Logout failed');
  }
  return data;
}

export async function getMe(token) {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.detail || 'Failed to fetch user profile');
    error.status = response.status;
    throw error;
  }
  return data; // returns { id, email }
}


// Conversations Persistence API Calls
export async function fetchConversations(token) {
  const response = await fetch('/api/conversations', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch conversations history');
  }
  return data; // returns array of conversation items
}

export async function fetchConversationDetail(conversationId, token) {
  const response = await fetch(`/api/conversations/${conversationId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch conversation details');
  }
  return data; // returns { id, title, messages, attachments }
}

export async function saveConversation(conversationData, token) {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(conversationData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to save conversation');
  }
  return data;
}

export async function deleteConversation(conversationId, token) {
  const response = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to delete conversation');
  }
  return data;
}

