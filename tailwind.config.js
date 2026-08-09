export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        surface: '#121214',
        surfaceHover: '#18181b',
        border: '#27272a',
        primary: '#eab308', // Yellow for CTAs/badges
        accent: '#10b981', // Green for AniList tags
        textMain: '#f4f4f5',
        textMuted: '#a1a1aa'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"JetBrains Mono"', 'monospace'], // Defaulting to monospace as requested
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
