import React, { useState } from 'react';

export default function ChatMessage({ message, onSpeak, isSpeakingThis }) {
  const { role, text, imageUrl, fileBadge, error, typing } = message;
  const isBot = role === 'bot';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Determine dynamic message timestamp
  const displayTime = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message-row ${role}`}>
      {/* Avatar Container */}
      <div className="message-avatar">
        {isBot ? '✦' : 'U'}
      </div>

      {/* Message Body Content */}
      <div className="message-body">
        <div className="message-header">
          <div className="message-sender">
            <span>{isBot ? 'Assistant' : 'You'}</span>
            {isBot && !typing && (
              <span 
                className="message-meta" 
                style={{ 
                  fontSize: '9px', 
                  background: 'var(--surface-hover)', 
                  padding: '1px 6px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border)', 
                  marginLeft: '8px' 
                }}
              >
                Local VLM Engine
              </span>
            )}
            <span className="message-meta" style={{ marginLeft: '6px', opacity: 0.6 }}>• {displayTime}</span>
          </div>

          {isBot && !typing && (
            <div className="message-actions">
              {/* Real voice synthesis button */}
              <button 
                className="message-btn"
                type="button"
                onClick={() => onSpeak && onSpeak(message.id, text)}
                title={isSpeakingThis ? "Stop reading response" : "Read response aloud"}
                style={{ color: isSpeakingThis ? 'var(--accent)' : 'inherit', fontWeight: isSpeakingThis ? 'bold' : 'normal' }}
              >
                {isSpeakingThis ? '⏹ Stop' : '🔊 Read'}
              </button>

              {/* Copy button */}
              <button 
                className="message-btn"
                type="button"
                onClick={handleCopy}
                title="Copy response text"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Display attachment badge for user documents */}
        {fileBadge && (
          <div className="message-badge">
            📎 {fileBadge}
          </div>
        )}

        {/* Display attached image thumbnail */}
        {imageUrl && (
          <div className="message-attachment">
            <img src={imageUrl} alt="User attachment thumbnail" />
          </div>
        )}

        {/* Render typing dots or text response */}
        {typing ? (
          <div className="typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          text && (
            <div className={`message-text ${error ? 'error' : ''}`}>
              {text}
            </div>
          )
        )}
      </div>
    </div>
  );
}
