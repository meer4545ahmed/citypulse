export default {
  content: [
    './citypulse/citypulse/index.html',
    './citypulse/citypulse/src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'wind-drift': 'windDrift 7s linear infinite',
        'wind-drift-slow': 'windDrift 11s linear infinite',
        'float-soft': 'floatSoft 4.5s ease-in-out infinite',
        'smog-move': 'smogMove 16s linear infinite',
        'orbit-spin': 'orbitSpin 22s linear infinite',
        'intro-rise': 'introRise 1.2s ease-out',
        'intro-fade': 'introFade 1.1s ease-out',
        'shimmer': 'shimmer 6s linear infinite',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        windDrift: {
          '0%': { transform: 'translateX(-20%) translateY(0px)', opacity: '0' },
          '15%': { opacity: '0.35' },
          '50%': { transform: 'translateX(40%) translateY(-6px)', opacity: '0.55' },
          '100%': { transform: 'translateX(120%) translateY(4px)', opacity: '0' },
        },
        floatSoft: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        smogMove: {
          '0%': { transform: 'translateX(-15%)', opacity: '0.2' },
          '50%': { opacity: '0.45' },
          '100%': { transform: 'translateX(110%)', opacity: '0.2' },
        },
        orbitSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        introRise: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        introFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
