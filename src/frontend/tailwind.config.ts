import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Caelith Brand Palette ─────────────── */
        brand: {
          dark: '#2D3333',
          light: '#F8F9FA',
          accent: '#C5E0EE',
          warm: '#E8A87C',
        },

        /* ── Light theme (default) ─────────────── */
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-hover)',
          sidebar: 'var(--bg-sidebar)',
        },
        surface: {
          DEFAULT: 'var(--bg-secondary)',
          muted: 'var(--bg-primary)',
          subtle: 'var(--bg-hover)',
        },
        accent: {
          50: '#f0f7fb',
          100: '#dceef7',
          200: '#C5E0EE',
          300: '#a0cde0',
          400: '#7bb8d2',
          500: '#5a9fc0',
          600: '#2D3333',
          700: '#242a2a',
          800: '#1c2121',
          900: '#141919',
          950: '#0d1010',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          placeholder: 'rgba(45,51,51,0.25)',
        },
        edge: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          warm: 'var(--border-warm)',
          'warm-strong': 'rgba(232,168,124,0.4)',
        },
        semantic: {
          success: 'var(--success)',
          'success-bg': 'var(--success-bg)',
          warning: 'var(--warning)',
          'warning-bg': 'var(--warning-bg)',
          danger: 'var(--danger)',
          'danger-bg': 'var(--danger-bg)',
          info: 'var(--text-primary)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'Sora', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 150ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
