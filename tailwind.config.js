/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "neubrutalism-yellow": "#ffff00",
        "neubrutalism-pink": "#ff69b4",
        "neubrutalism-cyan": "#00ffff",
        "neubrutalism-lime": "#32ff32",
        "neubrutalism-orange": "#ff4500",
      },
      boxShadow: {
        brutal: "8px 8px 0px 0px #000",
        "brutal-sm": "4px 4px 0px 0px #000",
        "brutal-lg": "12px 12px 0px 0px #000",
      },
    },
  },
  plugins: [],
};