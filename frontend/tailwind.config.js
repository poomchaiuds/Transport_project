/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-green': '#3df025', // สีเขียวสว่างตามรูป land.png
      }
    },
  },
  plugins: [],
}