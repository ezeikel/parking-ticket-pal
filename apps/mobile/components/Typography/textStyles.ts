import { cva } from "class-variance-authority";

type TextWeight = "normal" | "bold";
type TextFont = "inter" | "lato" | "uknumberplate" | "robotoslab";
type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const getFontClass = (font: TextFont, weight: TextWeight, italic: boolean): string => {
  const baseMapping: Record<string, Record<string, string>> = {
    inter: {
      normal: "font-inter",
      bold: "font-inter-bold",
    },
    lato: {
      normal: "font-lato",
      bold: "font-lato-bold",
    },
    uknumberplate: {
      normal: "font-uknumberplate",
      bold: "font-uknumberplate",
    },
    robotoslab: {
      normal: "font-robotoslab",
      bold: "font-robotoslab",
    },
  };

  if (italic && (font === 'inter' || font === 'lato')) {
    const italicMapping: Record<string, Record<string, string>> = {
      inter: {
        normal: "font-inter-italic",
        bold: "font-inter-bold", // No italic bold variant
      },
      lato: {
        normal: "font-lato-italic", 
        bold: "font-lato-bold", // No italic bold variant
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
  font = "inter",
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