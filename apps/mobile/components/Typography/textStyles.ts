import { cva } from "class-variance-authority";

type TextWeight = "normal" | "medium" | "semibold" | "bold" | "extrabold";
type TextFont = "jakarta" | "inter" | "lato" | "uknumberplate";
type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const getFontClass = (font: TextFont, weight: TextWeight, italic: boolean): string => {
  if (font === "jakarta") {
    if (italic) return "font-jakarta-italic";
    const jakartaWeightMap: Record<TextWeight, string> = {
      normal: "font-jakarta",
      medium: "font-jakarta-medium",
      semibold: "font-jakarta-semibold",
      bold: "font-jakarta-bold",
      extrabold: "font-jakarta-extrabold",
    };
    return jakartaWeightMap[weight];
  }

  const baseMapping: Record<string, Record<string, string>> = {
    inter: {
      normal: "font-inter",
      medium: "font-inter",
      semibold: "font-inter-bold",
      bold: "font-inter-bold",
      extrabold: "font-inter-bold",
    },
    lato: {
      normal: "font-lato",
      medium: "font-lato",
      semibold: "font-lato-bold",
      bold: "font-lato-bold",
      extrabold: "font-lato-bold",
    },
    uknumberplate: {
      normal: "font-uknumberplate",
      medium: "font-uknumberplate",
      semibold: "font-uknumberplate",
      bold: "font-uknumberplate",
      extrabold: "font-uknumberplate",
    },
  };

  if (italic && (font === 'inter' || font === 'lato')) {
    const italicMapping: Record<string, Record<string, string>> = {
      inter: {
        normal: "font-inter-italic",
        medium: "font-inter-italic",
        semibold: "font-inter-bold",
        bold: "font-inter-bold",
        extrabold: "font-inter-bold",
      },
      lato: {
        normal: "font-lato-italic",
        medium: "font-lato-italic",
        semibold: "font-lato-bold",
        bold: "font-lato-bold",
        extrabold: "font-lato-bold",
      },
    };
    return italicMapping[font][weight];
  }

  return baseMapping[font][weight];
};

const fontSize = cva([""], {
  variants: {
    size: {
      xs: ["text-xs"],
      sm: ["text-sm"],
      base: ["text-base"],
      lg: ["text-lg"],
      xl: ["text-xl"],
      "2xl": ["text-2xl"],
      "3xl": ["text-3xl"],
      "4xl": ["text-4xl"],
      "5xl": ["text-5xl"],
    },
  },
});

interface TextStyleProps {
  weight?: TextWeight;
  italic?: boolean;
  font?: TextFont;
  size?: TextSize;
  color?: string;
  className?: string;
}

export const getTextClassName = ({
  weight = "normal",
  italic = false,
  font = "jakarta",
  size = "base",
  color,
  className,
}: TextStyleProps) => {
  const fontFamily = getFontClass(font, weight, italic);
  const colorClass = color ? `text-[${color}]` : "";

  return cva([
    fontFamily,
    fontSize({ size }),
    colorClass,
    className,
  ])();
};
