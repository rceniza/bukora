/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cenere: {
          50: '#eff8f3',
          100: '#d9eee2',
          500: '#4ca77a',
          600: '#378e64',
          700: '#2d7253',
        },
        ink: '#202622',
        muted: '#7b837e',
        canvas: '#f6f8f6',
      },
    },
  },
  plugins: [],
}
