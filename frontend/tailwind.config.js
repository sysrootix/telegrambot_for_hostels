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
        tgButtonText: 'var(--tg-theme-button-text-color)',
        tgSecondaryBg: 'var(--tg-theme-secondary-bg-color)',
        tgSectionBg: 'var(--tg-theme-section-bg-color)',
        tgSeparator: 'var(--tg-theme-section-separator-color)',
        tgAccent: 'var(--tg-theme-accent-text-color)',
        tgSubtitle: 'var(--tg-theme-subtitle-text-color)',
        tgHeader: 'var(--tg-theme-header-bg-color)'
      },
      borderRadius: {
        xl: '20px'
      }
    }
  },
  plugins: []
};
