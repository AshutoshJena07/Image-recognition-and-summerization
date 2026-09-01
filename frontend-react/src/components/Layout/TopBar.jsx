import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  MenuIcon,
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
  Volume2Icon,
  VolumeXIcon,
  SlidersIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CheckIcon,
  ChevronDownIcon,
  LayoutDashboardIcon
} from '../Common/Icons';

export default function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  autoSpeak,
  setAutoSpeak,
  isSettingsOpen,
  setIsSettingsOpen,
  serverStatus,
  navigate,
  user,
  guestMode
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);

  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen]);

  const handleSelectTheme = (selected) => {
    setTheme(selected);
    setIsThemeMenuOpen(false);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <MonitorIcon size={16} />;
    if (theme === 'light') return <SunIcon size={16} />;
    return <MoonIcon size={16} />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'light') return 'Light';
    return 'Dark';
  };

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

        {/* Desktop Collapsed Sidebar quick-expand trigger (visible when sidebar is collapsed) */}
        {isSidebarCollapsed && (
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

      {/* 2. Right Cluster: Controls & Appearance */}
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

        {/* Professional 3-Mode Theme Selector Dropdown */}
        <div className="theme-selector-container" ref={themeMenuRef}>
          <button
            className={`topbar-action-btn theme-dropdown-btn ${isThemeMenuOpen ? 'active' : ''}`}
            type="button"
            aria-haspopup="true"
            aria-expanded={isThemeMenuOpen}
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            title={`Current theme: ${getThemeLabel()} (Click to change)`}
          >
            {getThemeIcon()}
            <span className="action-btn-text">{getThemeLabel()}</span>
            <ChevronDownIcon size={14} className={`dropdown-chevron ${isThemeMenuOpen ? 'open' : ''}`} />
          </button>

          {isThemeMenuOpen && (
            <div className="theme-dropdown-menu" role="menu" aria-label="Theme selection menu">
              <div className="theme-menu-header">Appearance</div>
              
              <button
                className={`theme-menu-item ${theme === 'light' ? 'selected' : ''}`}
                role="menuitem"
                onClick={() => handleSelectTheme('light')}
              >
                <div className="theme-item-left">
                  <SunIcon size={16} />
                  <span>Light</span>
                </div>
                {theme === 'light' && <CheckIcon size={16} className="check-mark" />}
              </button>

              <button
                className={`theme-menu-item ${theme === 'dark' ? 'selected' : ''}`}
                role="menuitem"
                onClick={() => handleSelectTheme('dark')}
              >
                <div className="theme-item-left">
                  <MoonIcon size={16} />
                  <span>Dark</span>
                </div>
                {theme === 'dark' && <CheckIcon size={16} className="check-mark" />}
              </button>

              <button
                className={`theme-menu-item ${theme === 'system' ? 'selected' : ''}`}
                role="menuitem"
                onClick={() => handleSelectTheme('system')}
              >
                <div className="theme-item-left">
                  <MonitorIcon size={16} />
                  <span>System</span>
                </div>
                {theme === 'system' && <CheckIcon size={16} className="check-mark" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
