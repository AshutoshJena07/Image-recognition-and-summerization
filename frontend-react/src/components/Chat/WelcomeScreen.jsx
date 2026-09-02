import React from 'react';
import {
  ImageIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  SparklesIcon
} from '../Common/Icons';

export default function WelcomeScreen({ onSelectSuggestion }) {
  const suggestions = [
    {
      icon: <ImageIcon size={16} />,
      title: 'Visual Summarization',
      desc: 'Describe this image in detail and list all notable visual features.',
      prompt: 'Describe this image in detail'
    },
    {
      icon: <FileTextIcon size={16} />,
      title: 'Document OCR Reader',
      desc: 'Extract handwritten notes, signatures, or printed text via local OCR.',
      prompt: 'Extract text via OCR'
    },
    {
      icon: <LayoutDashboardIcon size={16} />,
      title: 'Structured Table Analytics',
      desc: 'Parse columns, row stats, and data summaries from active sheets.',
      prompt: 'Summarize key columns and data details'
    },
    {
      icon: <SparklesIcon size={16} />,
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
            <div className="suggestion-card-icon-wrap" style={{ color: 'var(--accent-primary)', marginBottom: '4px' }}>
              {card.icon}
            </div>
            <div className="suggestion-card-title">{card.title}</div>
            <div className="suggestion-card-desc">{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
