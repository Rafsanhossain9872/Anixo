export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        miruro: {
          bg: '#0B0B0E',
          surface: '#1A1A1E',
          elevated: '#141418',
        },
        discord: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2e1065',
        }
      },
      fontWeight: {
        semibold: '500',
        bold: '500',
        extrabold: '500',
        black: '500',
      }
    },
  },
  plugins: [],
}
