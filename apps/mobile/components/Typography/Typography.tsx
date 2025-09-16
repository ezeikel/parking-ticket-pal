import type { ReactNode } from "react";
import type { StyleProp, TextProps, TextStyle } from "react-native";
import { Text, Platform } from "react-native";
import { getTextClassName } from "./textStyles";

export type TypographyProps = TextProps & {
  children: ReactNode;
  numberOfLines?: number;
  weight?: "normal" | "bold";
  italic?: boolean;
  style?: StyleProp<TextStyle>;
  font?: "inter" | "lato" | "uknumberplate" | "robotoslab";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  color?: string;
};

export const Typography = ({
  children,
  className,
  weight = "normal",
  italic = false,
  font = "inter",
  size = "base",
  color,
  numberOfLines = 0,
  ...props
}: TypographyProps) => {
  const allowFontScaling = props.allowFontScaling ?? !["5xl"].includes(size);
  const maxFontSizeMultiplier = props.maxFontSizeMultiplier;

  // Handle iOS italic styling
  const italicStyle = Platform.OS === 'ios' && italic && (font === 'inter' || font === 'lato') 
    ? { fontStyle: 'italic' as const } 
    : undefined;

  return (
    <Text
      className={getTextClassName({ weight, italic, font, size, color, className })}
      numberOfLines={numberOfLines}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[italicStyle, props.style]}
      {...props}
    >
      {children}
    </Text>
  );
};