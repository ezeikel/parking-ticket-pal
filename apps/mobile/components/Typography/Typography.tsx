import { Text } from "react-native";
import { cn } from "@/utils/cn";

type TypographyProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "text-16" | "vrm";
  onPress?: () => void;
};

const variantClasses = {
  'text-16': 'text-16 font-inter',
  'vrm': 'font-uknumberplate font-semibold text-lg',
}

export const Typography = ({ children, className, variant = 'text-16', onPress }: TypographyProps) => {
  return (
    <Text onPress={onPress} className={cn(variantClasses[variant], className)}>
      {children}
    </Text>
  );
};