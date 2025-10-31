/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-dark': 'var(--color-brand-dark)',
        'brand-light': 'var(--color-brand-light)',
        'brand-accent': 'var(--color-brand-accent)',
        'text-default': 'var(--color-text-default)',
        'bg-default': 'var(--color-bg-default)',
        'bg-card': 'var(--color-bg-card)',
        'border-card': 'var(--color-border-card)',
        'text-muted': 'var(--color-text-muted)',
        'text-heading': 'var(--color-text-heading)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}