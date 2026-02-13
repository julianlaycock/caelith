import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──────────────────────────────────
        bg: {
          primary:   '#0A0E1A',  // main background
          secondary: '#111827',  // cards, panels
          tertiary:  '#1A2035',  // hover, elevated
          sidebar:   '#0D1117',  // sidebar
        },
        surface: {
          DEFAULT: '#111827',
          muted:   '#0A0E1A',
          subtle:  '#1A2035',
        },

        // ── Accent (Cyan) ─────────────────────────────
        accent: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#083344',
        },

        // ── Text ──────────────────────────────────────
        ink: {
          DEFAULT:     '#F1F5F9',
          secondary:   '#94A3B8',
          tertiary:    '#64748B',
          muted:       '#475569',
          placeholder: '#334155',
        },

        // ── Borders ───────────────────────────────────
        edge: {
          DEFAULT: '#334155',
          subtle:  '#1E293B',
          strong:  '#475569',
        },

        // ── Semantic ──────────────────────────────────
        semantic: {
          success: '#34D399',
          warning: '#FBBF24',
          danger:  '#F87171',
          info:    '#22D3EE',
        },

        // ── Legacy compat (will phase out) ────────────
        brand: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#0D1117',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',   { lineHeight: '1rem' }],
        'sm':   ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem',  { lineHeight: '1.5rem' }],
        'lg':   ['1rem',      { lineHeight: '1.5rem' }],
        'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
        '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],
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
