/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        surface: 'rgba(11, 17, 32, 0.85)',
        'surface-card': 'rgba(15, 23, 42, 0.75)',
        'accent-cyan': '#06b6d4',
        'accent-blue': '#38bdf8',
        'accent-emerald': '#10b981',
        'accent-purple': '#c084fc',
        'border-glow': 'rgba(6, 182, 212, 0.25)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'radar-sweep': 'sweep 4s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'laser-scan': 'laserScan 3s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8))' },
        },
        laserScan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        }
      }
    },
  },
  plugins: [],
};
