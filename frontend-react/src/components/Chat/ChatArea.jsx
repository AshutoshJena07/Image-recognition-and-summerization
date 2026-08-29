import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import WelcomeScreen from './WelcomeScreen';

export default function ChatArea({ 
  messages, 
  onSelectSuggestion, 
  onSpeak, 
  speakingMessageId 
}) {
  const bottomRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-inner">
        {messages.length <= 1 && (
          <WelcomeScreen onSelectSuggestion={onSelectSuggestion} />
        )}
        
        {messages.map((msg, idx) => (
          <ChatMessage 
            key={msg.id || idx} 
            message={msg} 
            onSpeak={onSpeak}
            isSpeakingThis={speakingMessageId === msg.id}
          />
        ))}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
