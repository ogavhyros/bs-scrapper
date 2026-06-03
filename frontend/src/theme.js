// ── Pistachio Dream Design Tokens ─────────────────────────────────────────────
// Single source of truth for all design decisions.
// Import this file wherever you need raw token values outside of Tailwind.

export const colors = {
  brand:      '#42D674',
  brandLight: '#80EF80',
  brandPale:  '#E3F0A3',
  brandMuted: '#BADBA2',
  brandDark:  '#2ab55d',

  bg:      '#f8f9fa',
  sidebar: '#ffffff',
  card:    '#ffffff',
  border:  '#e5e7eb',

  text: {
    primary:   '#1a1a1a',
    secondary: '#6b7280',
    muted:     '#9ca3af',
    disabled:  '#d1d5db',
  },

  nav: {
    active: '#E3F0A3',
    hover:  '#f1f7d1',
  },

  priority: {
    critical: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
    high:     { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    normal:   { bg: '#E3F0A3', text: '#2ab55d', border: '#BADBA2' },
    neutral:  { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  },

  // Avatar palette — cycled by index
  avatars: [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
    '#ef4444', '#6366f1', '#0ea5e9', '#ec4899',
  ],

  status: {
    success: { bg: '#E3F0A3', text: '#2ab55d', border: '#BADBA2' },
    error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    info:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  },
};

export const radius = {
  sm:   '8px',
  md:   '12px',
  pill: '9999px',
};

export const shadow = {
  card:      '0 1px 3px rgba(0,0,0,0.08)',
  cardHover: '0 4px 12px rgba(0,0,0,0.10)',
  sidebar:   '1px 0 0 #e5e7eb',
  brandGlow: '0 4px 14px rgba(66,214,116,0.35)',
};

export const spacing = {
  sidebarWidth:  '260px',
  topbarHeight:  '56px',
  contentPad:    '32px',
};

export const typography = {
  pageTitle:  { size: '30px', weight: 700, color: colors.text.primary   },
  subtitle:   { size: '14px', weight: 400, color: colors.text.secondary },
  label:      { size: '11px', weight: 600, color: colors.text.muted     },
  body:       { size: '14px', weight: 400, color: colors.text.primary   },
  bodySmall:  { size: '12px', weight: 400, color: colors.text.secondary },
};

export default { colors, radius, shadow, spacing, typography };
