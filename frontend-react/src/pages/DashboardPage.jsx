import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchConversations, deleteConversation, checkHealth } from '../services/api';
import { validateFileExtension } from '../utils/fileValidation';
import ThemeDropdown from '../components/Common/ThemeDropdown';
import {
  PaperclipIcon,
  ImageIcon,
  FileTextIcon,
  Volume2Icon,
  FolderIcon,
  Trash2Icon,
  PlusIcon,
  LogOutIcon
} from '../components/Common/Icons';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('#/dashboard')}>
          <span className="brand-mark-sm">✦</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
            Multimodal Center
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Server status indicator */}
          <div className="dash-server-badge">
            <span className={`status-dot ${serverStatus}`} />
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{serverStatus}</span>
          </div>

          <ThemeDropdown />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', paddingRight: '4px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email || 'Logged In'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>User Account</span>
          </div>
          <button onClick={logout} className="toggle-button" style={{ borderColor: 'var(--status-error-border)', color: 'var(--status-offline)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LogOutIcon size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard body */}
      <main className="dash-body">
        {/* Banner greeting */}
        <section className="dash-welcome">
          <h1 style={{ fontSize: '21px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>
            Hello, {user?.email?.split('@')[0] || 'User'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '3px' }}>
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
            <div style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>
              <PaperclipIcon size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }}>Quick Launch File Session</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', textAlign: 'center', maxWidth: '320px', lineHeight: 1.4 }}>
              Drag and drop any image, video, PDF, Word, Excel, or code file here to open workspace immediately.
            </p>
            <label className="dash-upload-label" style={{ marginTop: '12px' }}>
              Browse Files
              <input type="file" onChange={handleFileChange} hidden />
            </label>
          </div>

          {/* Prompt template triggers */}
          <div className="dash-templates-card">
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>
              Workspace Presets
            </h3>
            <div className="dash-presets-list">
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Describe this image in detailed paragraphs, identifying all characters and items.')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                  <h4>Deep Image Reasoning</h4>
                </div>
                <p>Detailed semantic details and environment captioning.</p>
              </button>
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Scan this document, perform OCR, and return a clean text transcription.')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <FileTextIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                  <h4>Document OCR Transcription</h4>
                </div>
                <p>Extract strings, tables, receipts, or screenshots.</p>
              </button>
              <button 
                className="dash-preset-card" 
                onClick={() => onNewSessionWithPrompt('Read this script line and perform Text-to-Speech synthesis with emotional voice settings.')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Volume2Icon size={14} style={{ color: 'var(--accent-primary)' }} />
                  <h4>Speech Studio Synthesis</h4>
                </div>
                <p>Synthesize narration using emotional voice clips.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Recent runs workspace listing */}
        <section style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Workspace Runs
            </h2>
            <button className="new-chat-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '11.5px' }} onClick={() => navigate('#/workspace')}>
              <PlusIcon size={14} />
              <span>New Workspace</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Synchronizing active database sessions...
            </div>
          ) : errorMsg ? (
            <div style={{ padding: '16px', background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', borderRadius: 'var(--radius-md)', color: 'var(--status-offline)' }}>
              {errorMsg}
            </div>
          ) : conversations.length === 0 ? (
            <div className="dash-empty-state">
              <div style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: '6px' }}>
                <FolderIcon size={32} />
              </div>
              <h3>No past runs detected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '3px' }}>
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
                    <FileTextIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                    <button 
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="dash-card-delete-btn"
                      title="Delete Run"
                    >
                      <Trash2Icon size={13} />
                    </button>
                  </div>
                  <h3 className="dash-card-title" style={{ marginTop: '10px' }}>{conv.title}</h3>
                  <div style={{ flex: 1 }} />
                  <div className="dash-card-footer" style={{ marginTop: '14px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Updated: {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                    {conv.attachments && conv.attachments.length > 0 && (
                      <span className="dash-card-attachment-badge">
                        <PaperclipIcon size={10} style={{ marginRight: '3px' }} />
                        {conv.attachments.length} {conv.attachments.length === 1 ? 'attachment' : 'attachments'}
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

