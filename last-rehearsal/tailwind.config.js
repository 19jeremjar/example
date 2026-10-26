/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wall: '#b3271c',
        ink: '#17120f',
        paper: '#f1e6cf',
        amp: '#e8a33a',
      },
      fontFamily: {
        display: ['"Special Elite"', 'ui-monospace', 'monospace'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
