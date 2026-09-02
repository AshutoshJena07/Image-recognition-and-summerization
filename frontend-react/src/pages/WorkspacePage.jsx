import React, { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import ChatArea from '../components/Chat/ChatArea';
import ChatComposer from '../components/Chat/ChatComposer';
import { checkHealth, analyzeFile, fetchConversationDetail, saveConversation, fetchConversations, deleteConversation } from '../services/api';
import { validateFileExtension } from '../utils/fileValidation';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PlayIcon, PauseIcon, SquareIcon, XIcon } from '../components/Common/Icons';


export default function WorkspacePage({ 
  navigate, 
  conversationId, 
  preloadedFile, 
  clearPreloadedFile,
  preloadedPrompt,
  clearPreloadedPrompt
}) {
  const { token, user, guestMode, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('auto_speak') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');

  // Busy lock state to prevent duplicate submissions
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');

  // Active loaded session identifier (for SQLite syncing)
  const [currentSessionId, setCurrentSessionId] = useState(() => Date.now().toString());
  const [conversationsList, setConversationsList] = useState([]);

  // Chat Data States (Unique IDs and dynamic timestamps)
  const [messages, setMessages] = useState([
    {
      id: 'greeting',
      role: 'bot',
      text: 'Hello! I am your local Universal Multimodal AI Assistant. Upload any image, video, document, or code file, then ask me a question or request a summary!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [activeFile, setActiveFile] = useState(null);

  // Speech Hook Integration
  const {
    supported: ttsSupported,
    voices,
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    stop: stopSpeech
  } = useSpeechSynthesis();

  // Voice configurations states
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const initialLoadRef = useRef(false);

  // Load past conversation if ID is provided in URL path
  useEffect(() => {
    async function loadPastSession() {
      if (!conversationId || !token || guestMode) return;
      try {
        setAnalysisStatus('Loading conversation history...');
        setIsAnalyzing(true);
        const detail = await fetchConversationDetail(conversationId, token);
        setCurrentSessionId(detail.id);
        
        // Reconstruct messages mapping timestamp and styling parameters
        const formattedMessages = detail.messages.map(m => ({
          id: m.id || Math.random().toString(),
          role: m.role === 'assistant' ? 'bot' : 'user',
          text: m.content,
          imageUrl: m.imageUrl || null,
          fileBadge: m.fileBadge || null,
          timestamp: m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Failed to load past conversation details', err);
        alert('Could not retrieve conversation run.');
        navigate('#/dashboard');
      } finally {
        setIsAnalyzing(false);
        setAnalysisStatus('');
      }
    }

    loadPastSession();
  }, [conversationId, token, guestMode]);

  // Load conversions sidebar list
  const refreshSidebar = useCallback(async () => {
    if (!token || guestMode) return;
    try {
      const list = await fetchConversations(token);
      setConversationsList(list);
    } catch (err) {
      console.warn('Failed to load dynamic sidebar history', err);
    }
  }, [token, guestMode]);

  useEffect(() => {
    refreshSidebar();
  }, [refreshSidebar, messages]);

  // Process dashboard launch parameters (quick files or prompts)
  useEffect(() => {
    if (preloadedFile) {
      handleAttachFile(preloadedFile);
      clearPreloadedFile();
    }
    if (preloadedPrompt) {
      setPrompt(preloadedPrompt);
      clearPreloadedPrompt();
    }
  }, [preloadedFile, preloadedPrompt]);

  // Sync active conversation back to backend SQLite database
  const syncToDatabase = useCallback(async (updatedMessages) => {
    if (!token || guestMode) return;

    // Build unique title from the first query text
    const firstUserQuery = updatedMessages.find(m => m.role === 'user')?.text || 'Untitled Session';
    const cleanTitle = firstUserQuery.length > 28 ? `${firstUserQuery.slice(0, 25)}...` : firstUserQuery;

    // Package conversation rows
    const payload = {
      id: currentSessionId,
      title: cleanTitle,
      messages: updatedMessages.map(m => ({
        id: m.id,
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text,
        imageUrl: m.imageUrl || '',
        fileBadge: m.fileBadge || '',
        timestamp: m.timestamp
      })),
      attachments: activeFile ? [{ name: activeFile.name, type: activeFile.type }] : []
    };

    try {
      await saveConversation(payload, token);
    } catch (err) {
      console.error('Auto-save sync failed:', err);
    }
  }, [token, guestMode, currentSessionId, activeFile]);

  // Auto-initialize first English voice or fallback voice on mount/load
  useEffect(() => {
    if (voices.length > 0 && !selectedVoiceName) {
      const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      setSelectedVoiceName(defaultVoice.name);
    }
  }, [voices, selectedVoiceName]);

  const activeVoiceObj = voices.find(v => v.name === selectedVoiceName) || null;

  // Clear speaking message ID if synthesis stops externally
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakingMessageId(null);
    }
  }, [isSpeaking]);

  // Sync auto-speak preference
  useEffect(() => {
    localStorage.setItem('auto_speak', String(autoSpeak));
  }, [autoSpeak]);

  // Poll backend health status
  useEffect(() => {
    let active = true;
    const runCheck = async () => {
      const isOnline = await checkHealth();
      if (active) {
        setServerStatus(isOnline ? 'online' : 'offline');
      }
    };
    runCheck();
    const interval = setInterval(runCheck, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Centralized File Validation and Attachment Setter
  const handleAttachFile = useCallback((file) => {
    if (!validateFileExtension(file.name)) {
      alert(`Unsupported file format: "${file.name}".\n\nAllowed formats:\n• Images: png, jpg, jpeg, webp, bmp, gif, svg\n• Videos: mp4, avi, mov, mkv, webm\n• Documents: pdf, docx, doc, pptx, ppt\n• Data: xlsx, xls, csv\n• Text/Code: txt, json, md, py, js, ts`);
      return;
    }
    
    if (activeFile?.previewUrl) {
      URL.revokeObjectURL(activeFile.previewUrl);
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setActiveFile({
      fileObj: file,
      name: file.name,
      type: file.type,
      previewUrl: previewUrl
    });
  }, [activeFile]);

  const handleRemoveFile = useCallback(() => {
    if (activeFile?.previewUrl) {
      URL.revokeObjectURL(activeFile.previewUrl);
    }
    setActiveFile(null);
  }, [activeFile]);

  // Drag and Drop global listeners
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleAttachFile(files[0]);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleAttachFile]);

  // Paste handler listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleAttachFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleAttachFile]);

  // Reset conversation to fresh session (New Analysis)
  const handleNewSession = () => {
    if (activeFile?.previewUrl) {
      URL.revokeObjectURL(activeFile.previewUrl);
    }
    stopSpeech();
    setActiveFile(null);
    setPrompt('');
    setCurrentSessionId(Date.now().toString());
    setMessages([
      {
        id: 'greeting',
        role: 'bot',
        text: 'Hello! I am your local Universal Multimodal AI Assistant. Upload any image, video, document, or code file, then ask me a question or request a summary!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    
    // Redirect URL to a clean new workspace hash
    navigate('#/workspace');
  };

  // Speaks specific text response from active message
  const handleSpeakMessage = (msgId, text) => {
    if (!ttsSupported) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingMessageId === msgId && isSpeaking) {
      stopSpeech();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(msgId);
      speak(text, {
        voice: activeVoiceObj,
        rate: speechSpeed,
        pitch: speechPitch
      });
    }
  };

  // Speaks last bot message from active panel
  const handlePlayActiveResponse = () => {
    if (isPaused) {
      resume();
      return;
    }
    const lastBotMessage = [...messages].reverse().find(msg => msg.role === 'bot' && !msg.typing && !msg.error);
    if (lastBotMessage) {
      handleSpeakMessage(lastBotMessage.id, lastBotMessage.text);
    }
  };

  // Handle suggestion click on Welcome screen
  const handleSelectSuggestion = (selectedPrompt) => {
    setPrompt(selectedPrompt);
  };

  // Handle message submission with real API calls and attachments
  const handleSubmitMessage = async (submittedPrompt, attachedFile) => {
    if (isAnalyzing) return;
    
    const trimmedPrompt = submittedPrompt.trim();
    if (!trimmedPrompt && !attachedFile) {
      alert("Please provide a prompt message or attach a supported file to run the analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus(attachedFile ? `Analyzing file "${attachedFile.name}"...` : "Generating response...");
    stopSpeech();

    const userMsgId = Date.now().toString();
    const userMessage = {
      id: userMsgId,
      role: 'user',
      text: trimmedPrompt,
      imageUrl: attachedFile ? attachedFile.previewUrl : null,
      fileBadge: attachedFile && !attachedFile.previewUrl ? attachedFile.name : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    
    // Clear attachment state
    setActiveFile(null);

    // Add temporary typing indicator bot message
    const typingMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: typingMsgId, role: 'bot', typing: true }]);

    try {
      const fileObj = attachedFile ? attachedFile.fileObj : null;
      const result = await analyzeFile(trimmedPrompt, fileObj, messages);
      
      const botMsgId = (Date.now() + 2).toString();
      const botReply = {
        id: botMsgId,
        role: 'bot',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = currentMessages.concat(botReply);
      setMessages(finalMessages);
      setServerStatus('online');

      // Sync updated conversation details back to SQLite database asynchronously
      syncToDatabase(finalMessages);

      if (autoSpeak && ttsSupported) {
        setSpeakingMessageId(botMsgId);
        speak(result.answer, {
          voice: activeVoiceObj,
          rate: speechSpeed,
          pitch: speechPitch
        });
      }
    } catch (error) {
      console.error('API submission error:', error);
      
      let friendlyError = error.message || 'Failed to communicate with FastAPI backend server.';
      if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('NetworkError')) {
        friendlyError = 'Backend Server Unreachable. Please make sure the local FastAPI backend is running (run_backend.bat) and port 8000 is open.';
      }

      setMessages(prev => prev.filter(msg => msg.id !== typingMsgId).concat({
        id: (Date.now() + 3).toString(),
        role: 'bot',
        text: friendlyError,
        error: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      setServerStatus('offline');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // Delete conversation from database and list
  const handleDeletePastConversation = useCallback(async (conversationIdToDelete) => {
    if (!token || guestMode) return;
    try {
      await deleteConversation(conversationIdToDelete, token);
      setConversationsList(prev => prev.filter(c => c.id !== conversationIdToDelete));
      if (currentSessionId === conversationIdToDelete) {
        handleNewSession();
      }
    } catch (err) {
      console.error('Failed to delete past conversation:', err);
    }
  }, [token, guestMode, currentSessionId]);

  return (
    <MainLayout
      theme={theme}
      setTheme={setTheme}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      autoSpeak={autoSpeak}
      setAutoSpeak={setAutoSpeak}
      isSettingsOpen={isSettingsOpen}
      setIsSettingsOpen={setIsSettingsOpen}
      serverStatus={serverStatus}
      onNewSession={handleNewSession}
      conversationsList={conversationsList}
      activeSessionId={currentSessionId}
      onSelectConversation={(id) => navigate(`#/workspace/${id}`)}
      onDeleteConversation={handleDeletePastConversation}
      navigate={navigate}
      user={user}
      guestMode={guestMode}
      logout={logout}
    >
      {/* Scrollable messages container */}
      <ChatArea 
        messages={messages} 
        onSelectSuggestion={handleSelectSuggestion}
        onSpeak={handleSpeakMessage}
        speakingMessageId={speakingMessageId}
      />

      {/* Floating Settings Studio Drawer */}
      <div className={`settings-drawer ${isSettingsOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Voice Studio Settings</h3>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="icon-btn"
            style={{ padding: '3px' }}
            title="Close Voice Studio"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Voice Selection row */}
        <div className="settings-row">
          <div className="settings-label">Active Voice (Browser Native)</div>
          {ttsSupported ? (
            <select 
              className="settings-select"
              value={selectedVoiceName}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
            >
              {voices.map((voice, idx) => (
                <option key={idx} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Web Speech API not supported in this browser.
            </div>
          )}
        </div>

        {/* Speed Slider row */}
        <div className="settings-row">
          <div className="settings-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Speech Speed</span>
            <span>{speechSpeed}x</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1" 
            value={speechSpeed} 
            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            disabled={!ttsSupported}
          />
        </div>

        {/* Pitch Slider row */}
        <div className="settings-row">
          <div className="settings-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Speech Pitch</span>
            <span>{speechPitch}</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.1" 
            value={speechPitch} 
            onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            disabled={!ttsSupported}
          />
        </div>

        {/* Preview Trigger button */}
        <button
          className="toggle-button"
          onClick={() => {
            if (!ttsSupported) return;
            speak("Hello! This is a voice studio test preview.", {
              voice: activeVoiceObj,
              rate: speechSpeed,
              pitch: speechPitch
            });
          }}
          style={{ width: '100%', justifyContent: 'center', marginTop: '10px', background: 'var(--bg-surface-hover)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          disabled={!ttsSupported}
        >
          <PlayIcon size={12} />
          <span>Play Voice Preview</span>
        </button>

        {/* Playback Controls Row */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <button 
            className="toggle-button"
            onClick={handlePlayActiveResponse}
            style={{ flex: 1, justifyContent: 'center', fontSize: '11px', padding: '5px 0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Play/Resume Audio"
            disabled={!ttsSupported}
          >
            <PlayIcon size={11} />
            <span>{isPaused ? 'Resume' : 'Play'}</span>
          </button>
          <button 
            className="toggle-button"
            onClick={pause}
            style={{ flex: 1, justifyContent: 'center', fontSize: '11px', padding: '5px 0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Pause Audio"
            disabled={!ttsSupported || !isSpeaking || isPaused}
          >
            <PauseIcon size={11} />
            <span>Pause</span>
          </button>
          <button 
            className="toggle-button"
            onClick={stopSpeech}
            style={{ flex: 1, justifyContent: 'center', fontSize: '11px', padding: '5px 0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Stop Audio"
            disabled={!ttsSupported || !isSpeaking}
          >
            <SquareIcon size={11} />
            <span>Stop</span>
          </button>
        </div>
      </div>


      {/* Footer input text box composer */}
      <ChatComposer 
        prompt={prompt}
        setPrompt={setPrompt}
        activeFile={activeFile}
        onAttachFile={handleAttachFile}
        onRemoveFile={handleRemoveFile}
        onSubmit={handleSubmitMessage}
        isAnalyzing={isAnalyzing}
        analysisStatus={analysisStatus}
      />
    </MainLayout>
  );
}
