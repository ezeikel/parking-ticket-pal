import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHouse as faHouseSolid,
  faGear as faGearSolid,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faHouse as faHouseRegular,
  faGear as faGearRegular,
} from '@fortawesome/pro-regular-svg-icons';
import HapticTab from '@/components/HapticTab/HapticTab';
import CameraSheet from '@/components/CameraSheet/CameraSheet';
import ManualEntrySheet from '@/components/ManualEntrySheet/ManualEntrySheet';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SheetProvider, useSheetContext } from '@/contexts/SheetContext';

function TabLayoutInner() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme].tint;
  const { cameraVisible, manualEntryVisible, closeCamera, closeManualEntry } =
    useSheetContext();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tintColor,
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme].background,
            borderTopColor: Colors[colorScheme].border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tickets',
            tabBarIcon: ({ focused, color }) => (
              <FontAwesomeIcon
                icon={focused ? faHouseSolid : faHouseRegular}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="capture"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <FontAwesomeIcon
                icon={focused ? faGearSolid : faGearRegular}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <CameraSheet isVisible={cameraVisible} onClose={closeCamera} />
      <ManualEntrySheet
        isVisible={manualEntryVisible}
        onClose={closeManualEntry}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <SheetProvider>
      <TabLayoutInner />
    </SheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
