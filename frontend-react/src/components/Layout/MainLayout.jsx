import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout({ 
  children, 
  theme, 
  setTheme, 
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
  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewSession={onNewSession}
        conversationsList={conversationsList}
        activeSessionId={activeSessionId}
        navigate={navigate}
        user={user}
        guestMode={guestMode}
        logout={logout}
      />

      {/* Main Workspace Column */}
      <main className="main-content">
        <TopBar 
          theme={theme} 
          setTheme={setTheme} 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen}
          autoSpeak={autoSpeak}
          setAutoSpeak={setAutoSpeak}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          serverStatus={serverStatus}
          navigate={navigate}
          user={user}
          guestMode={guestMode}
        />
        
        {/* Children contains ChatArea and ChatComposer */}
        {children}
      </main>


      {/* Mobile Sidebar overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}
