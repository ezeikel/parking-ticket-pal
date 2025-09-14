import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter-Regular"],
        "inter-italic": ["Inter-Italic"],
        "inter-bold": ["Inter-Bold"],
        lato: ["Lato-Regular"],
        "lato-bold": ["Lato-Bold"],
        robotoslab: ["RobotoSlab-Regular"],
        uknumberplate: ["UKNumberPlate"],
      },
    },
  },
  plugins: [],
} satisfies Config;

