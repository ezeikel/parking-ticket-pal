import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import SquishyPressable from './SquishyPressable/SquishyPressable';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ActionButtonProps {
  onPress: () => void;
  icon?: IconDefinition;
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const getVariantStyles = (variant: ButtonVariant, disabled: boolean) => {
  const baseStyles = 'px-4 py-2 rounded-lg flex-row items-center justify-center';

  if (disabled) {
    return {
      container: `${baseStyles} bg-gray-300`,
      text: 'font-inter text-sm text-gray-500',
      iconColor: '#9ca3af',
    };
  }

  switch (variant) {
    case 'primary':
      return {
        container: `${baseStyles} bg-blue-500`,
        text: 'font-inter text-sm text-white font-semibold',
        iconColor: '#ffffff',
      };
    case 'danger':
      return {
        container: `${baseStyles} bg-red-500`,
        text: 'font-inter text-sm text-white font-semibold',
        iconColor: '#ffffff',
      };
    case 'secondary':
    default:
      return {
        container: `${baseStyles} bg-gray-200`,
        text: 'font-inter text-sm text-gray-700',
        iconColor: '#374151',
      };
  }
};

export function ActionButton({
  onPress,
  icon,
  label,
  variant = 'secondary',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ActionButtonProps) {
  const styles = getVariantStyles(variant, disabled || loading);

  return (
    <SquishyPressable
      onPress={onPress}
      disabled={disabled || loading}
      className={styles.container}
      style={fullWidth ? { flex: 1 } : undefined}
    >
      {loading ? (
        <ActivityIndicator size="small" color={styles.iconColor} />
      ) : (
        <>
          {icon && (
            <FontAwesomeIcon
              icon={icon}
              size={16}
              color={styles.iconColor}
              style={{ marginRight: 8 }}
            />
          )}
          <Text className={styles.text}>{label}</Text>
        </>
      )}
    </SquishyPressable>
  );
}

interface ActionButtonGroupProps {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'space-between';
  gap?: number;
}

export function ActionButtonGroup({
  children,
  align = 'right',
  gap = 8,
}: ActionButtonGroupProps) {
  const alignmentClass = align === 'space-between'
    ? 'justify-between'
    : align === 'left'
    ? 'justify-start'
    : 'justify-end';

  return (
    <View className={`flex-row ${alignmentClass}`} style={{ gap }}>
      {children}
    </View>
  );
}
