import React, { useRef, useEffect } from 'react';
import FileUploaderUI from './FileUploaderUI';
import { PaperclipIcon, ArrowUpIcon } from '../Common/Icons';

export default function ChatComposer({ 
  prompt, 
  setPrompt, 
  activeFile, 
  onAttachFile, 
  onRemoveFile, 
  onSubmit,
  isAnalyzing,
  analysisStatus
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Resize textarea on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [prompt]);

  const handleAttachClick = () => {
    if (isAnalyzing) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onAttachFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isAnalyzing) {
        handleSend();
      }
    }
  };

  const handleSend = () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt || activeFile) {
      onSubmit(trimmedPrompt, activeFile);
      setPrompt('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const isSendDisabled = (!prompt.trim() && !activeFile) || isAnalyzing;

  return (
    <div className="composer-wrap">
      <div className="composer-box">
        {/* Render file attachments wrapper */}
        <FileUploaderUI 
          activeFile={activeFile} 
          onRemove={onRemoveFile} 
        />

        <div className="composer-container">
          <div className="composer-input-row">
            {/* File Input ref */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isAnalyzing}
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.json,.md"
            />

            {/* Attach button */}
            <button 
              className="composer-btn attach-btn"
              type="button"
              onClick={handleAttachClick}
              disabled={isAnalyzing}
              style={{ opacity: isAnalyzing ? 0.35 : 1, cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
              title="Attach File (Image, Video, Document, Code)"
              aria-label="Attach file"
            >
              <PaperclipIcon size={16} />
            </button>

            {/* Input textarea */}
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder={isAnalyzing ? (analysisStatus || "Analyzing file...") : "Ask anything about an image, document, video, or file..."}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing}
              aria-label="User message query input"
            />

            {/* Send button */}
            <div className="composer-actions">
              <button 
                className="composer-btn submit-btn"
                type="button"
                onClick={handleSend}
                disabled={isSendDisabled}
                aria-label="Send message query"
                title="Send message"
              >
                <ArrowUpIcon size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Keyboard shortcut hint */}
        <div className="composer-hint">
          Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line
        </div>
      </div>
    </div>
  );
}
