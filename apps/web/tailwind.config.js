/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#122033",
          900: "#1A2F52",
          800: "#243A5E",
          700: "#35507A",
          600: "#4A6588",
        },
        gold: {
          50: "#FBF8EE",
          100: "#F4EBD3",
          300: "#D4BC7A",
          500: "#C4A04A",
          600: "#A88638",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
        display: ["Inter", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 14px 32px -20px rgba(26, 47, 82, 0.28)",
      },
    },
  },
  plugins: [],
};
