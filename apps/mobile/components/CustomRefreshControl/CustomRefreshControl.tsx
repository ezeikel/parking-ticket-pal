import { RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type CustomRefreshControlProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

const CustomRefreshControl = ({
  refreshing,
  onRefresh,
}: CustomRefreshControlProps) => {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]}
    />
  );
};

export default CustomRefreshControl;
