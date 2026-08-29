import React from 'react';

export default function WelcomeScreen({ onSelectSuggestion }) {
  const suggestions = [
    {
      icon: '🖼️',
      title: 'Visual Summarization',
      desc: 'Describe this image in detail and list all notable visual features.',
      prompt: 'Describe this image in detail'
    },
    {
      icon: '📝',
      title: 'Document OCR Reader',
      desc: 'Extract handwritten notes, signatures, or printed text via local OCR.',
      prompt: 'Extract text via OCR'
    },
    {
      icon: '📊',
      title: 'Structured Table Analytics',
      desc: 'Parse columns, row stats, and data summaries from active sheets.',
      prompt: 'Summarize key columns and data details'
    },
    {
      icon: '🎥',
      title: 'Video Midpoint Analysis',
      desc: 'Examine duration, frame counts, and describe the midpoint sampled frame.',
      prompt: 'Analyze this video midpoint frame and details'
    }
  ];

  return (
    <div className="welcome-container">
      <div className="welcome-orb" aria-hidden="true">✦</div>
      <p className="welcome-eyebrow">Multimodal Workspace</p>
      <h1 className="welcome-title">What would you like to analyze<br />in your workspace today?</h1>
      <p className="welcome-subtitle">
        Drop any file (image, video, PDF, sheet, document, or code) and ask questions. Processing runs completely locally on your system.
      </p>

      <div className="suggestions-grid">
        {suggestions.map((card, idx) => (
          <button
            key={idx}
            className="suggestion-card"
            type="button"
            onClick={() => onSelectSuggestion(card.prompt)}
          >
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{card.icon}</div>
            <div className="suggestion-card-title">{card.title}</div>
            <div className="suggestion-card-desc">{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
