/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 推し活らしい柔らかい配色（ピンク・紫・水色基調）
        oshi: {
          pink: '#FF8FB1',
          pinkLight: '#FFD9E6',
          purple: '#B79CED',
          purpleLight: '#E5DBFF',
          blue: '#8FD3FF',
          blueLight: '#D6F0FF',
          bg: '#FFF6FB',
          text: '#4A3F55',
          sub: '#9B8FA8',
        },
      },
      fontFamily: {
        sans: [
          '"Hiragino Maru Gothic ProN"',
          '"Hiragino Sans"',
          '"Noto Sans JP"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 6px 20px -6px rgba(183, 156, 237, 0.35)',
        soft: '0 2px 10px -2px rgba(255, 143, 177, 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
