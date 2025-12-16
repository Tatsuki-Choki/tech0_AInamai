/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#243a9f',
          secondary: '#8e8e93',
          buttons: '#e59a86',
          text: {
            secondary: '#8e8e93',
            'card-unselected': '#efedea',
          }
        },
        background: {
          surface: '#ffffff',
          app: '#fff4ed',
        }
      },
      fontFamily: {
        'zen-maru': ['"Zen Maru Gothic"', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'noto-sans': ['"Noto Sans JP"', 'sans-serif'],
      },
      boxShadow: {
        'card': '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
        'button-surface': '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)',
      },
      borderRadius: {
        'card': '24px',
        'button': '24px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
