import React from 'react';

export default function TopBar({ 
  theme, 
  setTheme, 
  isSidebarOpen, 
  setIsSidebarOpen,
  autoSpeak,
  setAutoSpeak,
  isSettingsOpen,
  setIsSettingsOpen,
  serverStatus,
  navigate,
  user,
  guestMode
}) {
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mobile Hamburger toggle */}
        <button 
          className="icon-btn" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ fontSize: '18px', padding: '6px', cursor: 'pointer' }}
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          ☰
        </button>

        <a 
          className="brand" 
          href={guestMode ? '#/' : '#/dashboard'} 
          onClick={(e) => {
            e.preventDefault();
            navigate(guestMode ? '#/' : '#/dashboard');
          }}
          aria-label="Image Assistant home"
        >
          <span className="brand-mark">✦</span>
          <span>Universal Assistant</span>
        </a>

        {/* Server Status Indicator Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          fontSize: '11px', 
          background: 'var(--surface-hover)', 
          padding: '4px 10px', 
          borderRadius: '12px', 
          border: '1px solid var(--border)' 
        }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            display: 'inline-block',
            background: serverStatus === 'online' ? '#10b981' : serverStatus === 'offline' ? '#ef4444' : '#f59e0b',
            boxShadow: serverStatus === 'online' ? '0 0 6px #10b981' : 'none'
          }} />
          <span style={{ color: 'var(--muted)', fontWeight: '600', textTransform: 'capitalize' }}>
            {serverStatus === 'online' ? 'connected' : serverStatus === 'offline' ? 'offline' : 'connecting'}
          </span>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Dashboard shortcut link */}
        {!guestMode && (
          <button 
            className="toggle-button"
            type="button" 
            onClick={() => navigate('#/dashboard')}
            title="Return to Dashboard Center"
          >
            <span>📊</span>
            <span>Dashboard</span>
          </button>
        )}

        {/* Auto-Speak Toggle */}
        <button 
          id="auto-speak-toggle" 
          className={`toggle-button ${autoSpeak ? 'active' : ''}`}
          type="button" 
          aria-pressed={autoSpeak}
          title="Toggle Auto Read-Aloud"
          onClick={() => setAutoSpeak(!autoSpeak)}
        >
          <span>{autoSpeak ? '🔊' : '🔇'}</span>
          <span>Auto-Speak</span>
        </button>

        {/* Theme Switcher Button */}
        <button 
          className="toggle-button" 
          type="button" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>Theme</span>
        </button>

        {/* Settings Studio Trigger */}
        <button 
          className={`toggle-button ${isSettingsOpen ? 'active' : ''}`}
          type="button" 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Toggle Voice Settings Panel"
        >
          <span>⚙️</span>
          <span>Voice Studio</span>
        </button>
      </div>
    </header>
  );
}
