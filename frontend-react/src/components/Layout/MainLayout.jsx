import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

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
  navigate,
  user,
  guestMode,
  logout
}) {
  // Sidebar collapsed state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Sync collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Global Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        // Ensure not in an input or textarea
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsSidebarCollapsed(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onNewSession={onNewSession}
        conversationsList={conversationsList}
        activeSessionId={activeSessionId}
        navigate={navigate}
        user={user}
        guestMode={guestMode}
        logout={logout}
      />

      {/* Main Content Workspace Column */}
      <main className="main-content" id="main-workspace-content">
        <TopBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          autoSpeak={autoSpeak}
          setAutoSpeak={setAutoSpeak}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          serverStatus={serverStatus}
          navigate={navigate}
          user={user}
          guestMode={guestMode}
        />

        {/* Workspace Children (ChatArea, ChatComposer, Settings drawer) */}
        <div className="workspace-scroll-area">
          {children}
        </div>
      </main>

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}
