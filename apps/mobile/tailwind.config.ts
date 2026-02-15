import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ["PlusJakartaSans-Regular"],
        "jakarta-medium": ["PlusJakartaSans-Medium"],
        "jakarta-semibold": ["PlusJakartaSans-SemiBold"],
        "jakarta-bold": ["PlusJakartaSans-Bold"],
        "jakarta-extrabold": ["PlusJakartaSans-ExtraBold"],
        "jakarta-italic": ["PlusJakartaSans-Italic"],
        inter: ["Inter18pt-Regular"],
        "inter-bold": ["Inter18pt-Bold"],
        "inter-italic": ["Inter18pt-Italic"],
        lato: ["Lato-Regular"],
        "lato-bold": ["Lato-Bold"],
        "lato-italic": ["Lato-Italic"],
        uknumberplate: ["UKNumberPlate"],
      },
      colors: {
        dark: "#222222",
        gray: {
          DEFAULT: "#717171",
        },
        light: "#f7f7f7",
        teal: {
          DEFAULT: "#1abc9c",
          dark: "#16a085",
        },
        coral: "#ff5a5f",
        amber: "#ffb400",
        success: "#00a699",
        border: "#e2e8f0",
      },
    },
  },
  plugins: [],
} satisfies Config;
