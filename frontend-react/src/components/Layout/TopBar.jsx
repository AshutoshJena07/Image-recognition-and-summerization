import React from 'react';
import {
  MenuIcon,
  PanelLeftOpenIcon,
  Volume2Icon,
  VolumeXIcon,
  SlidersIcon,
  LayoutDashboardIcon,
  HistoryIcon
} from '../Common/Icons';
import ThemeDropdown from '../Common/ThemeDropdown';

export default function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isSidebarHidden,
  setIsSidebarHidden,
  isHistoryOpen,
  setIsHistoryOpen,
  autoSpeak,
  setAutoSpeak,
  isSettingsOpen,
  setIsSettingsOpen,
  serverStatus,
  navigate,
  user,
  guestMode
}) {
  return (
    <header className="topbar" aria-label="Application Header">
      {/* 1. Left Cluster: Sidebar Controls & Context */}
      <div className="topbar-left">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle navigation drawer"
          title="Toggle Navigation Menu"
        >
          <MenuIcon size={20} />
        </button>

        {/* Restore Left Sidebar button (visible when sidebar is hidden) */}
        {isSidebarHidden && (
          <button
            className="icon-btn topbar-sidebar-toggle"
            onClick={() => setIsSidebarHidden(false)}
            aria-label="Restore Left Sidebar (Ctrl+B)"
            title="Restore Left Sidebar (Ctrl+B)"
          >
            <PanelLeftOpenIcon size={18} />
          </button>
        )}

        {/* Desktop Collapsed Sidebar quick-expand trigger (visible when sidebar is collapsed and not hidden) */}
        {!isSidebarHidden && isSidebarCollapsed && (
          <button
            className="icon-btn topbar-sidebar-toggle"
            onClick={() => setIsSidebarCollapsed(false)}
            aria-label="Expand sidebar (Ctrl+B)"
            title="Expand Sidebar (Ctrl+B)"
          >
            <PanelLeftOpenIcon size={18} />
          </button>
        )}

        {/* Breadcrumb / Context Label */}
        <div className="topbar-breadcrumb">
          <span className="breadcrumb-brand" onClick={() => navigate(guestMode ? '#/' : '#/dashboard')} role="button" tabIndex={0}>
            <span className="brand-mark-sm">✦</span>
            <span className="breadcrumb-title">Multimodal Assistant</span>
          </span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-context">Workspace</span>
        </div>

        {/* Live Server Status Indicator Badge */}
        <div
          className={`server-status-pill ${serverStatus}`}
          title={`Backend status: ${serverStatus === 'online' ? 'Connected (FastAPI :8000)' : serverStatus === 'offline' ? 'Offline (Check run_backend.bat)' : 'Connecting...'}`}
        >
          <span className="status-indicator-dot" />
          <span className="status-indicator-text">
            {serverStatus === 'online' ? 'Connected' : serverStatus === 'offline' ? 'Offline' : 'Connecting'}
          </span>
        </div>
      </div>

      {/* 2. Right Cluster: Controls, History & Appearance */}
      <div className="topbar-right">
        {/* Dashboard shortcut link for authenticated users */}
        {!guestMode && (
          <button
            className="topbar-action-btn"
            type="button"
            onClick={() => navigate('#/dashboard')}
            title="Return to Dashboard Center"
            aria-label="Dashboard Center"
          >
            <LayoutDashboardIcon size={16} />
            <span className="action-btn-text">Dashboard</span>
          </button>
        )}

        {/* Auto-Speak Read-Aloud Toggle */}
        <button
          id="auto-speak-toggle"
          className={`topbar-action-btn ${autoSpeak ? 'active' : ''}`}
          type="button"
          aria-pressed={autoSpeak}
          title={autoSpeak ? "Auto-Speak is active (Click to mute auto-read)" : "Auto-Speak is off (Click to enable auto-read)"}
          onClick={() => setAutoSpeak(!autoSpeak)}
        >
          {autoSpeak ? <Volume2Icon size={16} /> : <VolumeXIcon size={16} />}
          <span className="action-btn-text">Auto-Speak</span>
        </button>

        {/* Voice Studio Drawer Trigger */}
        <button
          className={`topbar-action-btn ${isSettingsOpen ? 'active' : ''}`}
          type="button"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Toggle Voice Studio settings"
        >
          <SlidersIcon size={16} />
          <span className="action-btn-text">Voice Studio</span>
        </button>

        {/* Right-side Conversation History Toggle */}
        <button
          id="history-panel-toggle"
          className={`topbar-action-btn ${isHistoryOpen ? 'active' : ''}`}
          type="button"
          aria-expanded={isHistoryOpen}
          onClick={() => setIsHistoryOpen && setIsHistoryOpen(!isHistoryOpen)}
          title={isHistoryOpen ? "Hide Conversation History" : "Show Conversation History"}
          aria-label="Conversation History"
        >
          <HistoryIcon size={16} />
          <span className="action-btn-text">History</span>
        </button>

        {/* Professional 3-Mode Theme Selector Dropdown */}
        <ThemeDropdown />
      </div>
    </header>
  );
}
