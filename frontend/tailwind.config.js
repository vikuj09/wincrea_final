/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0F1720',
          900: '#151F2B',
          800: '#1E2A38',
          700: '#2B3A4C',
          600: '#3E5064',
        },
        canvas: '#F6F4EF',
        panel: '#FFFFFF',
        slate: {
          50: '#F6F4EF',
          100: '#EDE9E0',
        },
        loom: {
          50: '#FBF4EC',
          100: '#F3E2C8',
          300: '#DDB273',
          500: '#B9812F',
          600: '#966423',
          700: '#744C1A',
        },
        signal: {
          good: '#3E7D5A',
          warn: '#B9812F',
          bad: '#B34D3C',
          info: '#3E5B8C',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,32,0.06), 0 1px 12px rgba(15,23,32,0.04)',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
};
