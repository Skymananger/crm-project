/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        'sky-blue': '#00A8E8',
        'deep-blue': '#003459',
        'accent-blue': '#007AFF',
      },
      fontFamily: {
        'outfit': ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
