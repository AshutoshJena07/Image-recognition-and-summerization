import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CheckIcon,
  ChevronDownIcon
} from './Icons';

export default function ThemeDropdown({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTheme = (selected) => {
    setTheme(selected);
    setIsOpen(false);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <MonitorIcon size={15} />;
    if (theme === 'light') return <SunIcon size={15} />;
    return <MoonIcon size={15} />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'light') return 'Light';
    return 'Dark';
  };

  return (
    <div className={`theme-selector-container ${className}`} ref={dropdownRef}>
      <button
        className={`topbar-action-btn theme-dropdown-btn ${isOpen ? 'active' : ''}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        title={`Appearance: ${getThemeLabel()} (Click to change)`}
      >
        {getThemeIcon()}
        <span className="action-btn-text">{getThemeLabel()}</span>
        <ChevronDownIcon size={13} className={`dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu" role="menu" aria-label="Theme selection menu">
          <div className="theme-menu-header">Appearance</div>

          <button
            className={`theme-menu-item ${theme === 'system' ? 'selected' : ''}`}
            role="menuitem"
            type="button"
            onClick={() => handleSelectTheme('system')}
          >
            <div className="theme-item-left">
              <MonitorIcon size={14} />
              <span>System</span>
            </div>
            {theme === 'system' && <CheckIcon size={14} className="check-mark" />}
          </button>

          <button
            className={`theme-menu-item ${theme === 'light' ? 'selected' : ''}`}
            role="menuitem"
            type="button"
            onClick={() => handleSelectTheme('light')}
          >
            <div className="theme-item-left">
              <SunIcon size={14} />
              <span>Light</span>
            </div>
            {theme === 'light' && <CheckIcon size={14} className="check-mark" />}
          </button>

          <button
            className={`theme-menu-item ${theme === 'dark' ? 'selected' : ''}`}
            role="menuitem"
            type="button"
            onClick={() => handleSelectTheme('dark')}
          >
            <div className="theme-item-left">
              <MoonIcon size={14} />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <CheckIcon size={14} className="check-mark" />}
          </button>
        </div>
      )}
    </div>
  );
}

