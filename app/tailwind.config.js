/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Paleta migrada del HTML original
        blue: { DEFAULT: "#2563eb", 600: "#2563eb", 700: "#1d4ed8" },
        green: { DEFAULT: "#16a34a" },
        red: { DEFAULT: "#dc2626" },
        orange: { DEFAULT: "#ea580c" },
        purple: { DEFAULT: "#7c3aed" },
      },
    },
  },
  plugins: [],
};
