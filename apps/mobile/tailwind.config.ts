import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter18pt-Regular"],
        "inter-bold": ["Inter18pt-Bold"],
        "inter-italic": ["Inter18pt-Italic"],
        lato: ["Lato-Regular"],
        "lato-bold": ["Lato-Bold"],
        "lato-italic": ["Lato-Italic"],
        robotoslab: ["RobotoSlab-Regular"],
        uknumberplate: ["UKNumberPlate"],
      },
    },
  },
  plugins: [],
} satisfies Config;

