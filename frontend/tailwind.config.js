/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tgBg: 'var(--tg-theme-bg-color)',
        tgText: 'var(--tg-theme-text-color)',
        tgHint: 'var(--tg-theme-hint-color)',
        tgButton: 'var(--tg-theme-button-color)',
        tgButtonText: 'var(--tg-theme-button-text-color)'
      },
      borderRadius: {
        xl: '20px'
      }
    }
  },
  plugins: []
};
