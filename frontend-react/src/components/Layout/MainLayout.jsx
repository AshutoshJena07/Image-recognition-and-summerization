import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ConversationHistoryPanel from './ConversationHistoryPanel';

export default function MainLayout({
  children,
  isSidebarOpen,
  setIsSidebarOpen,
  autoSpeak,
  setAutoSpeak,
  isSettingsOpen,
  setIsSettingsOpen,
  serverStatus,
  onNewSession,
  conversationsList,
  activeSessionId,
  onSelectConversation,
  onDeleteConversation,
  navigate,
  user,
  guestMode,
  logout
}) {
  // Sidebar collapsed state (State B: 68px) persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Sidebar hidden state (State C: 0px / completely hidden) persisted in localStorage
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    return localStorage.getItem('sidebar_hidden') === 'true';
  });

  // Right-side History panel open state
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    const saved = localStorage.getItem('history_panel_open');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' ? window.innerWidth > 1180 : true;
  });

  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_hidden', String(isSidebarHidden));
  }, [isSidebarHidden]);

  useEffect(() => {
    localStorage.setItem('history_panel_open', String(isHistoryOpen));
  }, [isHistoryOpen]);

  // Global Keyboard shortcut: Ctrl+B or Cmd+B to cycle sidebar states
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          if (isSidebarHidden) {
            setIsSidebarHidden(false);
            setIsSidebarCollapsed(false);
          } else if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
          } else {
            setIsSidebarCollapsed(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarHidden, isSidebarCollapsed]);

  return (
    <div 
      className={`app-container ${
        isSidebarHidden 
          ? 'sidebar-is-hidden' 
          : isSidebarCollapsed 
            ? 'sidebar-is-collapsed' 
            : 'sidebar-is-expanded'
      } ${isHistoryOpen ? 'history-is-open' : 'history-is-closed'}`}
    >
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isHidden={isSidebarHidden}
        setIsHidden={setIsSidebarHidden}
        onNewSession={onNewSession}
        conversationsList={conversationsList}
        activeSessionId={activeSessionId}
        navigate={navigate}
        user={user}
        guestMode={guestMode}
        logout={logout}
      />

      {/* 2. Main Content Workspace Column */}
      <main className="main-content" id="main-workspace-content">
        <TopBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isSidebarHidden={isSidebarHidden}
          setIsSidebarHidden={setIsSidebarHidden}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={setIsHistoryOpen}
          autoSpeak={autoSpeak}
          setAutoSpeak={setAutoSpeak}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          serverStatus={serverStatus}
          navigate={navigate}
          user={user}
          guestMode={guestMode}
        />

        {/* 3. Primary 2-Column Workspace Body */}
        <div className="workspace-body-layout">
          {/* Chat Center Area (Messages, Composer, Settings) */}
          <div className="workspace-center-stage">
            {children}
          </div>

          {/* Dedicated Right-Side Conversation History Panel */}
          <ConversationHistoryPanel
            isOpen={isHistoryOpen}
            setIsOpen={setIsHistoryOpen}
            conversationsList={conversationsList}
            activeSessionId={activeSessionId}
            onSelectConversation={onSelectConversation || ((id) => navigate(`#/workspace/${id}`))}
            onNewSession={onNewSession}
            onDeleteConversation={onDeleteConversation}
            guestMode={guestMode}
          />
        </div>
      </main>

      {/* Mobile Left Sidebar Drawer Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Right History Drawer Overlay */}
      <div
        className={`history-overlay ${isHistoryOpen ? 'active' : ''}`}
        onClick={() => setIsHistoryOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}
