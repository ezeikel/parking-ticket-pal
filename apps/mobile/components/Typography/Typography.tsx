import { Text } from "react-native";
import tw from 'twrnc';

type TypographyProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "text-16" | "vrm";
  onPress?: () => void;
};

const variantClasses = {
  'text-16': 'text-16',
  'vrm': 'font-uk-number-plate font-semibold text-lg',
}

export const Typography = ({ children, className, variant = 'text-16', onPress }: TypographyProps) => {
  return (
    <Text onPress={onPress} style={tw.style(variantClasses[variant], className)}>
      {children}
    </Text>
  );
};