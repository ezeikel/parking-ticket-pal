import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';

type OptionalPressableProps = PressableProps & {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
};

const OptionalPressable = ({
  children,
  onPress,
  className,
  ...props
}: OptionalPressableProps) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cn(props.disabled && 'opacity-60', className)}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return <View>{children}</View>;
};

export default OptionalPressable;
