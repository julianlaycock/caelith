import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F2EFE0',
          secondary: '#E3DDD9',
          tertiary: '#DDE2E5',
          sidebar: '#D2CFBE',
        },
        surface: {
          DEFAULT: '#E3DDD9',
          muted: '#F2EFE0',
          subtle: '#DDE2E5',
        },
        accent: {
          50: '#EAF0F6',
          100: '#D7E2ED',
          200: '#B4C8DD',
          300: '#8AA9C7',
          400: '#5F86AC',
          500: '#24364A',
          600: '#1F2F40',
          700: '#172331',
          800: '#111A25',
          900: '#0D141D',
          950: '#080D14',
        },
        ink: {
          DEFAULT: '#2D2722',
          secondary: '#5A524B',
          tertiary: '#6E655D',
          muted: '#80766D',
          placeholder: '#948A82',
        },
        edge: {
          DEFAULT: '#C6BEB1',
          subtle: '#D2CABB',
          strong: '#B5AA9A',
        },
        semantic: {
          success: '#3D6658',
          warning: '#9C6E2D',
          danger: '#8A4A45',
          info: '#24364A',
        },
        brand: {
          50: '#EAF0F6',
          100: '#D7E2ED',
          200: '#B4C8DD',
          300: '#8AA9C7',
          400: '#5F86AC',
          500: '#24364A',
          600: '#1F2F40',
          700: '#172331',
          800: '#111A25',
          900: '#0D141D',
          950: '#080D14',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
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
