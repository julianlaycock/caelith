import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-navy-875',
    'text-navy-875',
    'hover:bg-navy-900',
    'focus:ring-navy-875',
    'focus:border-navy-875',
    'border-navy-875',
    'ring-navy-875',
    'bg-navy-50',
  ],
  theme: {
    extend: {
      colors: {
        // Primary greens — institutional forest palette
        brand: {
          50:  '#F0FDF6',
          100: '#DCFCE8',
          200: '#BBF7D1',
          300: '#86EFAD',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#0B2E1F',
        },
        // Navy blue accents — elegant complement
        navy: {
          50:  '#EFF3FB',
          100: '#DBE3F5',
          200: '#BFCCED',
          300: '#94A7D6',
          400: '#6B7FBC',
          500: '#4B5EA5',
          600: '#3B4A8A',
          700: '#323D70',
          800: '#2C355E',
          875: '#000042',
          850: '#253568',
          900: '#1E2540',
          950: '#141929',
        },
        // Surface colors
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAF9',
          subtle: '#F0F4F2',
        },
        // Text colors
        ink: {
          DEFAULT: '#0F1D18',
          secondary: '#4B6358',
          tertiary: '#7A9488',
          placeholder: '#A3BBAF',
        },
        // Border colors
        edge: {
          DEFAULT: '#D1DDD7',
          subtle: '#E8EFE9',
          strong: '#A3BBAF',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
