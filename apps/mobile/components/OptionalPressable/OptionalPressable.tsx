import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';

type OptionalPressableProps = PressableProps & {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const OptionalPressable = ({
  children,
  onPress,
  className,
  style,
  ...props
}: OptionalPressableProps) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cn(props.disabled && 'opacity-60', className)}
        style={style}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={style}>{children}</View>;
};

export default OptionalPressable;
