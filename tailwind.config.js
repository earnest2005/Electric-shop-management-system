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
          50: '#f0fdf4',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        electric: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          glow: 'rgba(20, 184, 166, 0.25)'
        },
        dark: {
          900: '#111827',
          800: '#1F2937',
          700: '#273549',
          600: '#374151',
          500: '#4B5563'
        },
        sidebar: {
          bg: '#18212F',
          hover: '#273549',
          active: '#14B8A6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
