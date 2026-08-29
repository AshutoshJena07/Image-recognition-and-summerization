import React, { useState } from 'react';

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  onNewSession,
  conversationsList = [],
  activeSessionId,
  navigate,
  user,
  guestMode,
  logout
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Interactively filter history list by search query
  const filteredHistory = conversationsList.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Sidebar Branding */}
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '80px', borderBottom: '1px solid var(--border)', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('#/dashboard')}>
          <span className="brand-mark">✦</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>
            Multimodal AI
          </span>
        </div>
        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
          {guestMode ? 'Sandbox Workspace' : 'Synced Workspace'}
        </span>
      </div>

      {/* New Analysis Button */}
      <div style={{ padding: '16px 16px 8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button 
          className="new-chat-btn"
          onClick={() => {
            if (onNewSession) onNewSession();
            setIsOpen(false);
          }}
        >
          <span>＋</span> New Session
        </button>
        {!guestMode && (
          <button 
            className="toggle-button"
            style={{ width: '100%', justifyContent: 'center', borderRadius: '10px', padding: '8px' }}
            onClick={() => navigate('#/dashboard')}
          >
            📊 Dashboard
          </button>
        )}
      </div>

      {/* Search Filter input (Hidden in Guest Sandbox to avoid empty space) */}
      {!guestMode && (
        <div className="sidebar-search-container">
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="sidebar-search-box"
              placeholder="Search past analyses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '28px' }}
              aria-label="Search conversation history"
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--muted)', pointerEvents: 'none' }}>
              🔍
            </span>
          </div>
        </div>
      )}

      {/* Sidebar Scrolling History List */}
      <div className="sidebar-scroll">
        <div className="sidebar-title">{guestMode ? 'Sandbox runs' : 'Recent Runs'}</div>
        
        {guestMode ? (
          <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
            Running in non-persistent sandbox. Create an account to sync history databases.
          </div>
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map(item => (
            <div 
              key={item.id} 
              className={`history-item ${item.id === activeSessionId ? 'active' : ''}`}
              onClick={() => {
                navigate(`#/workspace/${item.id}`);
                setIsOpen(false);
              }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '13px' }}>📄</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
            No synced runs found
          </div>
        )}
      </div>

      {/* Sidebar Profile Card at Bottom */}
      <div className="sidebar-footer">
        <div className="profile-avatar">
          {guestMode ? 'G' : (user?.email?.charAt(0).toUpperCase() || 'U')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {guestMode ? 'Guest Session' : (user?.email?.split('@')[0] || 'Logged In')}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {guestMode ? 'guest@workspace.local' : (user?.email || 'authenticated')}
          </span>
        </div>
        <button 
          className="icon-btn" 
          onClick={logout}
          style={{ padding: '4px', fontSize: '14px' }}
          title={guestMode ? 'Exit Sandbox' : 'Sign Out Account'}
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
