/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'rhino-blue': '#1E40AF',
        'rhino-green': '#10B981',
        'rhino-red': '#EF4444',
        'rhino-orange': '#F59E0B',
        'rhino-purple': '#8B5CF6',
        'rhino-gray': '#6B7280',
        'dark-bg': '#0F172A',
        'dark-card': '#1E293B',
        'dark-border': '#334155'
      },
      fontFamily: {
        'mono': ['Monaco', 'Cascadia Code', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class'
} 