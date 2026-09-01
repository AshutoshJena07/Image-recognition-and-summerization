import React, { useState } from 'react';
import {
  SparklesIcon,
  PlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MessageSquareIcon,
  LayoutDashboardIcon,
  SearchIcon,
  FileTextIcon,
  LogOutIcon,
  XIcon
} from '../Common/Icons';

export default function Sidebar({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
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

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleNewSessionClick = () => {
    if (onNewSession) onNewSession();
    if (isOpen) setIsOpen(false);
  };

  const handleNavClick = (hash) => {
    navigate(hash);
    if (isOpen) setIsOpen(false);
  };

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Main Navigation Sidebar"
    >
      {/* 1. Header / Brand & Collapse Toggle */}
      <div className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={() => handleNavClick('#/dashboard')}
          title="Multimodal AI Workspace Home"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavClick('#/dashboard');
            }
          }}
        >
          <span className="brand-mark" aria-hidden="true">✦</span>
          {!isCollapsed && (
            <div className="brand-info">
              <span className="brand-name">Multimodal AI</span>
              <span className="brand-badge">
                {guestMode ? 'Sandbox' : 'Synced'}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle / Mobile Close */}
        <div className="sidebar-header-actions">
          {/* Mobile close button */}
          <button
            className="icon-btn mobile-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation drawer"
            title="Close navigation drawer"
          >
            <XIcon size={18} />
          </button>

          {/* Desktop sidebar collapse/expand toggle */}
          <button
            className="icon-btn desktop-collapse-btn"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            {isCollapsed ? <PanelLeftOpenIcon size={18} /> : <PanelLeftCloseIcon size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Primary Actions (+ New Session) */}
      <div className="sidebar-actions-section">
        <button
          className="new-chat-btn"
          onClick={handleNewSessionClick}
          title="Start a new analysis session"
          aria-label="New Session"
        >
          <PlusIcon size={18} />
          {!isCollapsed && <span className="btn-label">New Session</span>}
        </button>
      </div>

      {/* 3. Navigation Links */}
      <nav className="sidebar-nav" aria-label="Workspace Views">
        <button
          className={`sidebar-nav-item ${window.location.hash.startsWith('#/workspace') ? 'active' : ''}`}
          onClick={() => handleNavClick('#/workspace')}
          title="AI Workspace"
          aria-label="AI Workspace"
          aria-current={window.location.hash.startsWith('#/workspace') ? 'page' : undefined}
        >
          <span className="nav-icon"><MessageSquareIcon size={18} /></span>
          {!isCollapsed && <span className="nav-label">AI Workspace</span>}
        </button>

        {!guestMode && (
          <button
            className={`sidebar-nav-item ${window.location.hash === '#/dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('#/dashboard')}
            title="Dashboard Center"
            aria-label="Dashboard Center"
            aria-current={window.location.hash === '#/dashboard' ? 'page' : undefined}
          >
            <span className="nav-icon"><LayoutDashboardIcon size={18} /></span>
            {!isCollapsed && <span className="nav-label">Dashboard</span>}
          </button>
        )}
      </nav>

      {/* 4. Search Filter (Expanded only) */}
      {!guestMode && !isCollapsed && (
        <div className="sidebar-search-container">
          <div className="sidebar-search-wrapper">
            <span className="search-icon-adornment" aria-hidden="true">
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              className="sidebar-search-box"
              placeholder="Search past runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversation history"
            />
          </div>
        </div>
      )}

      {/* 5. Scrollable Runs History */}
      <div className="sidebar-scroll">
        {!isCollapsed && (
          <div className="sidebar-title">
            {guestMode ? 'Sandbox runs' : 'Recent Runs'}
          </div>
        )}

        {isCollapsed ? (
          // Collapsed indicator for history
          <div className="collapsed-history-indicator" title={`${conversationsList.length} past runs available`}>
            <div className="collapsed-dot-stack">
              <FileTextIcon size={16} />
              {conversationsList.length > 0 && (
                <span className="collapsed-count-badge">{conversationsList.length}</span>
              )}
            </div>
          </div>
        ) : guestMode ? (
          <div className="sidebar-empty-state">
            Running in sandbox. Sign in to persist your multimodal analysis history.
          </div>
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map(item => (
            <div
              key={item.id}
              className={`history-item ${item.id === activeSessionId ? 'active' : ''}`}
              onClick={() => handleNavClick(`#/workspace/${item.id}`)}
              title={item.title}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavClick(`#/workspace/${item.id}`);
                }
              }}
            >
              <span className="history-icon" aria-hidden="true">
                <FileTextIcon size={14} />
              </span>
              <span className="history-text">{item.title}</span>
            </div>
          ))
        ) : (
          <div className="sidebar-empty-state">
            {searchQuery ? 'No matching runs found' : 'No past runs yet'}
          </div>
        )}
      </div>

      {/* 6. User Profile Card & Sign Out */}
      <div className="sidebar-footer">
        <div
          className="profile-info-wrap"
          title={guestMode ? 'Guest Session' : (user?.email || 'Logged In User')}
        >
          <div className="profile-avatar" aria-hidden="true">
            {guestMode ? 'G' : (user?.email?.charAt(0).toUpperCase() || 'U')}
          </div>
          {!isCollapsed && (
            <div className="profile-details">
              <span className="profile-name">
                {guestMode ? 'Guest Session' : (user?.email?.split('@')[0] || 'User')}
              </span>
              <span className="profile-email">
                {guestMode ? 'guest@workspace.local' : (user?.email || 'authenticated')}
              </span>
            </div>
          )}
        </div>

        <button
          className="icon-btn logout-btn"
          onClick={logout}
          aria-label={guestMode ? "Exit Sandbox" : "Sign Out Account"}
          title={guestMode ? "Exit Sandbox" : "Sign Out Account"}
        >
          <LogOutIcon size={16} />
        </button>
      </div>
    </aside>
  );
}
