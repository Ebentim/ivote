/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:      '#2f6ab2',
          'blue-light': '#4a85cc',
          'blue-dark':  '#1e4d8a',
          'blue-deeper': '#0f2d56',
          grey:      '#626e80',
          'grey-light': '#8b95a3',
          'grey-dark':  '#3e4756',
          white:     '#f0f7ff',
          'white-dim': '#d8e8f5',
          ink:       '#0a1628',
          'ink-soft': '#111e33',
          'ink-muted': '#1a2d47',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-blue': '0 0 40px rgba(47,106,178,0.25)',
        'glow-sm':   '0 0 16px rgba(47,106,178,0.15)',
        'card':      '0 2px 12px rgba(10,22,40,0.35)',
        'card-hover':'0 8px 32px rgba(10,22,40,0.5)',
        'modal':     '0 24px 80px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-ink': "linear-gradient(rgba(47,106,178,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(47,106,178,0.06) 1px, transparent 1px)",
        'noise':    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease both',
        'slide-up':     'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-dot':    'pulseDot 1.8s ease-in-out infinite',
        'shimmer':      'shimmer 1.8s linear infinite',
        'spin-slow':    'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseDot:     { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.4', transform: 'scale(0.75)' } },
        shimmer:      { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
