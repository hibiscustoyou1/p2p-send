// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        "primary-dark": "#2563EB",
        "background-light": "#f8fafc",
        "background-dark": "#0F172A",
        "surface-light": "#ffffff",
        "surface-dark": "#1E293B",
        "surface-darker": "#020617",
        "accent-success": "#10B981",
        "accent-warning": "#F59E0B",
        "accent-error": "#EF4444",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1rem",
        full: "9999px",
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
