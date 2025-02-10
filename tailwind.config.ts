import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'uk-number-plate': ["UKNumberPlate", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

