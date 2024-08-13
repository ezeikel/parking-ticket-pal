/** @type {import('tailwindcss').Config} */
module.exports = {
content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        perfect:
          "0 24px 24px -12px rgba(14, 63, 126, 0.04), 0 12px 12px -6px rgba(14, 63, 126, 0.04), 0 6px 6px -3px rgba(42, 51, 70, 0.04), 0 3px 3px -1.5px rgba(42, 51, 70, 0.04), 0 1px 1px -0.5px rgba(42, 51, 70, 0.04), 0 4px 4px 1px rgba(14, 63, 126, 0.04)",
      },
    },
  },
  plugins: [],
}

