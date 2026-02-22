import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faWifi } from '@fortawesome/pro-solid-svg-icons';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="absolute top-0 left-0 right-0 z-50 bg-red-500"
    >
      <View className="flex-row items-center justify-center py-2 px-4">
        <FontAwesomeIcon icon={faWifi} size={14} color="#ffffff" style={{ marginRight: 8 }} />
        <Text className="font-jakarta-medium text-sm text-white">
          No internet connection
        </Text>
      </View>
    </View>
  );
}
