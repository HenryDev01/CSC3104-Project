/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fadeUp': 'fadeUp 0.8s ease-out forwards',
        'fadeUp-delay-200': 'fadeUp 0.8s ease-out 0.2s forwards',
        'fadeUp-delay-400': 'fadeUp 0.8s ease-out 0.4s forwards',

      },
      fontFamily: {
        sans: ['Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

