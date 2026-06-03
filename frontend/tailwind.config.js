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
        // ── Brand (Pistachio Dream) ───────────────────────────────────────
        brand: {
          light:   '#80EF80',
          pale:    '#E3F0A3',
          muted:   '#BADBA2',
          DEFAULT: '#42D674',
          dark:    '#2ab55d',
        },

        // ── Page structure ────────────────────────────────────────────────
        surface:  '#f8f9fa',
        panel:    '#ffffff',

        // ── Borders ───────────────────────────────────────────────────────
        line:     '#e5e7eb',

        // ── Text scale ────────────────────────────────────────────────────
        ink: {
          DEFAULT: '#1a2e1a',
          soft:    '#4a7a4a',
          muted:   '#6b7280',
          ghost:   '#d1d5db',
        },

        // ── Navigation ────────────────────────────────────────────────────
        nav: {
          active: '#E3F0A3',
          hover:  '#f1f7d1',
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
          bg:     '#E3F0A3',
          text:   '#2ab55d',
          border: '#BADBA2',
        },
      },

      boxShadow: {
        card:         '0 1px 3px rgba(0,0,0,0.08)',
        'card-lg':    '0 4px 12px rgba(0,0,0,0.10)',
        'brand-glow': '0 4px 14px rgba(66,214,116,0.35)',
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
