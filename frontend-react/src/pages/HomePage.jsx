import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function HomePage({ navigate }) {
  const { token, enterGuestMode } = useAuth();
  const [sandboxPrompt, setSandboxPrompt] = useState('Select a showcase feature below...');
  const [sandboxAnswer, setSandboxAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Quick sandbox runs simulation
  const handleSimulateAnalysis = (featureName, promptText, answerText) => {
    if (isTyping) return;
    setSandboxPrompt(promptText);
    setSandboxAnswer('');
    setIsTyping(true);

    let charIndex = 0;
    const interval = setInterval(() => {
      setSandboxAnswer(prev => prev + answerText.charAt(charIndex));
      charIndex++;
      if (charIndex >= answerText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
  };

  return (
    <div className="landing-shell">
      {/* Premium Static Navigation Header */}
      <header className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="brand-mark" style={{ height: '28px', width: '28px', fontSize: '14px' }}>✦</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#fff' }}>
            Multimodal AI
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#specs" className="landing-nav-link">Specifications</a>
          {token ? (
            <button className="landing-btn-primary" onClick={() => navigate('#/dashboard')}>
              Go to Dashboard
            </button>
          ) : (
            <>
              <button className="landing-nav-link" onClick={() => navigate('#/login')} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                Sign In
              </button>
              <button className="landing-btn-primary" onClick={() => navigate('#/signup')}>
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Container */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="welcome-eyebrow" style={{ color: 'var(--accent)', letterSpacing: '0.3em', fontWeight: 800 }}>
            ✦ PRIVACY-FIRST COGNITIVE COMPASS
          </div>
          <h1 className="landing-title">
            Intelligent Image Recognition <br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              & Summarization Workspace
            </span>
          </h1>
          <p className="landing-subtitle">
            Upload files, extract high-fidelity text with EasyOCR, and prompt offline local LLMs inside a private environment. Zero data leakage, full audio narration.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
            {token ? (
              <button className="landing-btn-hero" onClick={() => navigate('#/dashboard')}>
                Enter Dashboard ➜
              </button>
            ) : (
              <>
                <button className="landing-btn-hero" onClick={() => navigate('#/signup')}>
                  Create Free Account
                </button>
                <button className="landing-btn-hero-secondary" onClick={enterGuestMode}>
                  Try Sandbox Session (No Sign Up)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Floating Cognitive Orb Graphic */}
        <div className="welcome-orb" style={{ width: '120px', height: '120px', fontSize: '32px', margin: '40px auto 20px auto' }}>
          ✦
        </div>
      </section>

      {/* Live Interactive Sandbox Preview */}
      <section id="sandbox" className="landing-section">
        <div className="landing-inner">
          <h2 className="section-title">Experience the AI Assistant</h2>
          <p className="section-subtitle">Click a capabilities preview preset below to witness the local models segment, extract, and analyze in real time.</p>

          <div className="sandbox-card">
            <div className="sandbox-preview-header">
              <div style={{ display: 'flex', gap: '5px' }}>
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>sandbox-simulation.local</span>
            </div>
            
            <div className="sandbox-body">
              <div className="sandbox-message-row user">
                <div className="sandbox-prompt">
                  <strong>Prompt:</strong> {sandboxPrompt}
                </div>
              </div>
              
              <div className="sandbox-message-row assistant">
                {sandboxAnswer ? (
                  <div className="sandbox-response">
                    <strong>Assistant Response:</strong>
                    <div style={{ marginTop: '8px', lineHeight: 1.5 }}>{sandboxAnswer}</div>
                  </div>
                ) : isTyping ? (
                  <div className="sandbox-loading-pulse">Analyzing attached document...</div>
                ) : (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '13px' }}>
                    Select a preview option below to start simulation...
                  </div>
                )}
              </div>
            </div>

            <div className="sandbox-presets-row">
              <button 
                className="sandbox-preset-btn" 
                onClick={() => handleSimulateAnalysis(
                  'ocr', 
                  'Perform OCR and extract receipt table details.', 
                  '[OCR Scan Results]\n- Merchant: Local Market Store\n- Total Amount: $42.50\n- Date: August 29, 2026\n- Items: Milk ($3.20), Fresh Berries ($6.50), Coffee Beans ($12.80), Artisan Bread ($5.00)'
                )}
              >
                📝 Document OCR Scan
              </button>
              <button 
                className="sandbox-preset-btn" 
                onClick={() => handleSimulateAnalysis(
                  'vision', 
                  'Analyze this diagram of database tables.', 
                  '[Multimodal Vision Analysis]\n- Identified: A 3-table entity relation mapping schema.\n- Target Tables: users, sessions, conversations.\n- Relationships: users.id has foreign key bounds on sessions.user_id and conversations.user_id.'
                )}
              >
                📊 Schema Diagram Analysis
              </button>
              <button 
                className="sandbox-preset-btn" 
                onClick={() => handleSimulateAnalysis(
                  'tts', 
                  'Read script text with happy voice synthesis.', 
                  '[Cartesia Voice Synthesis Segment: HAPPY]\nSpeech is synthesized at 44.1kHz sample rate with sonic-3.6. Sound output has been successfully mapped to natural audio channels.'
                )}
              >
                🔊 Speech Synthesis Play
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Specifications & Blueprint */}
      <section id="specs" className="landing-section" style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="landing-inner">
          <h2 className="section-title">Technical Specifications</h2>
          <p className="section-subtitle">Fully local data residency paired with standard acceleration backends.</p>

          <div className="specs-grid">
            <div className="spec-card">
              <h3>Salesforce BLIP VQA</h3>
              <p>Uses local Salesforce/blip-vqa-base weights cached locally. Excellent for prompt-guided object queries and captioning.</p>
            </div>
            <div className="spec-card">
              <h3>Ollama LLM Orchestration</h3>
              <p>Connects to your local Ollama runtime, leveraging Qwen 2.5 and Llama 3 models offline to yield maximum privacy.</p>
            </div>
            <div className="spec-card">
              <h3>EasyOCR Processing</h3>
              <p>Supports robust document reading, automatically isolating text regions and feeding results as prompt context.</p>
            </div>
            <div className="spec-card">
              <h3>Cartesia Sonic 3.6</h3>
              <p>Features ultra-low latency voice narration via Cartesia Sonic API with automated tag-controlled sentiment synthesis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Multimodal AI Workspace. Run Locally. Process Privately.</p>
      </footer>
    </div>
  );
}
