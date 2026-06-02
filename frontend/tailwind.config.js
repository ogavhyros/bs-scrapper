/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    screens: {
      'sm':  '375px',
      'md':  '428px',
      'lg':  '769px',
      'xl':  '1024px',
      '2xl': '1280px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ── Brand ────────────────────────────────────────────────────────
        brand:    '#22c55e',

        // ── Page structure ────────────────────────────────────────────────
        surface:  '#f8f9fa',     // page background
        panel:    '#ffffff',     // sidebar / card background

        // ── Borders ───────────────────────────────────────────────────────
        line:     '#e5e7eb',

        // ── Text scale ────────────────────────────────────────────────────
        ink: {
          DEFAULT: '#1a1a1a',
          soft:    '#6b7280',
          muted:   '#9ca3af',
          ghost:   '#d1d5db',
        },

        // ── Navigation ────────────────────────────────────────────────────
        nav: {
          active: '#f3f4f6',
          hover:  '#f9fafb',
        },

        // ── Priority system ───────────────────────────────────────────────
        critical: {
          bg:     '#fee2e2',
          text:   '#dc2626',
          border: '#fecaca',
        },
        high: {
          bg:     '#fef3c7',
          text:   '#d97706',
          border: '#fde68a',
        },
        normal: {
          bg:     '#f0fdf4',
          text:   '#16a34a',
          border: '#bbf7d0',
        },
      },

      boxShadow: {
        card:      '0 1px 3px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 12px rgba(0,0,0,0.10)',
      },

      borderRadius: {
        card: '12px',
        nav:  '8px',
      },

      width: {
        sidebar: '260px',
      },

      minWidth: {
        sidebar: '260px',
      },
    },
  },
  plugins: [],
};
