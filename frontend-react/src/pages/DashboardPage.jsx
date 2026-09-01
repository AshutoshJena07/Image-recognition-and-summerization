import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchConversations, deleteConversation, checkHealth } from '../services/api';
import { validateFileExtension } from '../utils/fileValidation';

export default function DashboardPage({ navigate, onNewSessionWithFile, onNewSessionWithPrompt }) {
  const { token, user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');

  // Load history list from backend
  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const list = await fetchConversations(token);
        setConversations(list);
      } catch (err) {
        setErrorMsg('Failed to sync history lists.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Check server status
    checkHealth().then(status => {
      setServerStatus(status ? 'online' : 'offline');
    });
  }, [token]);

  // Handle deleting a conversation
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent card click navigation
    if (!window.confirm('Are you sure you want to delete this session?')) return;

    try {
      await deleteConversation(id, token);
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete conversation.');
    }
  };

  // Drag and Drop files to launch workspace
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!validateFileExtension(file.name)) {
        alert('Unsupported file extension.');
        return;
      }
      if (onNewSessionWithFile) {
        onNewSessionWithFile(file);
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!validateFileExtension(file.name)) {
        alert('Unsupported file extension.');
        return;
      }
      if (onNewSessionWithFile) {
        onNewSessionWithFile(file);
      }
    }
  };

  return (
    <div className="dash-shell">
      {/* Dashboard Top bar */}
      <header className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="brand-mark">✦</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
            Multimodal Center
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Server status indicator */}
          <div className="dash-server-badge">
            <span className={`status-dot ${serverStatus}`} />
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{serverStatus}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11.5px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email || 'Logged In'}</span>
            <span style={{ color: 'var(--text-muted)' }}>User Account</span>
          </div>
          <button onClick={logout} className="toggle-button" style={{ borderColor: 'var(--status-error-border)', color: 'var(--status-offline)' }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Dashboard body */}
      <main className="dash-body">
        {/* Banner greeting */}
        <section className="dash-welcome">
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>
            Hello, {user?.email?.split('@')[0] || 'User'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Welcome to your private local reasoning dashboard. Evolve past simple captioning.
          </p>
        </section>

        {/* Upload Hub and Quick Stats */}
        <div className="dash-top-grid">
          {/* Quick Upload Widget */}
          <div 
            className="dash-upload-card" 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>Quick Launch File Session</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginTop: '4px', textAlign: 'center', maxWidth: '320px' }}>
              Drag and drop any image, video, PDF, Word, Excel, or code file here to open workspace immediately.
            </p>
            <label className="dash-upload-label" style={{ marginTop: '16px' }}>
              Browse Files
              <input type="file" onChange={handleFileChange} hidden />
            </label>
          </div>

          {/* Prompt template triggers */}
          <div className="dash-templates-card">
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700 }}>
              Workspace Presets
            </h3>
            <div className="dash-presets-list">
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Describe this image in detailed paragraphs, identifying all characters and items.')}
              >
                <h4>🖼️ Deep Image Reasoning</h4>
                <p>Detailed semantic details and environment captioning.</p>
              </button>
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Scan this document, perform OCR, and return a clean text transcription.')}
              >
                <h4>📄 Document OCR Transcription</h4>
                <p>Extract strings, tables, receipts, or screenshots.</p>
              </button>
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Read this script line and perform Text-to-Speech synthesis with emotional voice settings.')}
              >
                <h4>🔊 Speech Studio Synthesis</h4>
                <p>Synthesize narration using emotional voice clips.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Recent runs workspace listing */}
        <section style={{ marginTop: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Workspace Runs
            </h2>
            <button className="new-chat-btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => navigate('#/workspace')}>
              ＋ New Workspace
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Synchronizing active database sessions...
            </div>
          ) : errorMsg ? (
            <div style={{ padding: '20px', background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', borderRadius: 'var(--radius-md)', color: 'var(--status-offline)' }}>
              {errorMsg}
            </div>
          ) : conversations.length === 0 ? (
            <div className="dash-empty-state">
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>📁</span>
              <h3>No past runs detected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                You haven't run any private analyses yet. Launch a session or drop a file to start!
              </p>
            </div>
          ) : (
            <div className="dash-history-grid">
              {conversations.map(conv => (
                <div 
                  key={conv.id} 
                  className="dash-history-card"
                  onClick={() => navigate(`#/workspace/${conv.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <button 
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="dash-card-delete-btn"
                      title="Delete Run"
                    >
                      ×
                    </button>
                  </div>
                  <h3 className="dash-card-title" style={{ marginTop: '12px' }}>{conv.title}</h3>
                  <div style={{ flex: 1 }} />
                  <div className="dash-card-footer" style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Updated: {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                    {conv.attachments && conv.attachments.length > 0 && (
                      <span className="dash-card-attachment-badge">
                        📎 {conv.attachments.length} attachment
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
