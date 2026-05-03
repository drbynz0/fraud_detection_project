// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Instrument Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        base:    '#080c14',
        surface: '#0d1422',
        card:    '#111827',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'pulse-ring': 'pulse-ring 1.5s infinite',
        'scan':       'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};
