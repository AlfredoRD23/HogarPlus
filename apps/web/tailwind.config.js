/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#071428",
          900: "#0B1F4A",
          800: "#0E2A5C",
          700: "#163A7A",
          600: "#1E4D96",
        },
        gold: {
          50: "#FBF6E8",
          100: "#F5E6C8",
          300: "#E4C36A",
          500: "#D4A017",
          600: "#C08A0C",
        },
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(11, 31, 74, 0.12)",
      },
    },
  },
  plugins: [],
};
