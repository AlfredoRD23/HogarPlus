/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0f172a",
          900: "#111827",
          800: "#1f2937",
          700: "#334155",
          600: "#475569",
        },
        gold: {
          50: "#f8fafc",
          100: "#f1f5f9",
          300: "#94a3b8",
          500: "#334155",
          600: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
        display: ["Inter", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -22px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
};
