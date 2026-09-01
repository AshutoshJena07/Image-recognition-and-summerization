import React from 'react';

const baseIconProps = (size = 18, strokeWidth = 1.85, className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: `icon-svg ${className}`.trim(),
  'aria-hidden': 'true',
});

export const SparklesIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export const PlusIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PanelLeftCloseIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m14 9-3 3 3 3" />
  </svg>
);

export const PanelLeftOpenIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m13 15 3-3-3-3" />
  </svg>
);

export const MenuIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

export const MessageSquareIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const LayoutDashboardIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export const SlidersIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="1" x2="7" y1="14" y2="14" />
    <line x1="9" x2="15" y1="8" y2="8" />
    <line x1="17" x2="23" y1="16" y2="16" />
  </svg>
);

export const Volume2Icon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const VolumeXIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" x2="16" y1="9" y2="15" />
    <line x1="16" x2="22" y1="9" y2="15" />
  </svg>
);

export const SunIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

export const MoonIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const MonitorIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

export const SearchIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const LogOutIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

export const UserIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const FileTextIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

export const ImageIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

export const PaperclipIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export const ArrowUpIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

export const CheckIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CopyIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const Trash2Icon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

export const XIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const ChevronDownIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ size = 18, strokeWidth = 1.85, className = '' }) => (
  <svg {...baseIconProps(size, strokeWidth, className)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
