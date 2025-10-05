import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHouse as faHouseRegular, faCog as faCogRegular } from "@fortawesome/pro-regular-svg-icons";
import { faHouse as faHouseSolid, faCamera as faCameraSolid, faCog as faCogSolid } from "@fortawesome/pro-solid-svg-icons";
import { perfect } from "@/styles";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import HapticTab from "@/components/HapticTab/HapticTab";
import CaptureModal from '@/components/modals/CaptureModal';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [cameraVisible, setCameraVisible] = useState(false);

  const handleCameraPress = () => {
    setCameraVisible(true);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarLabelStyle: {
            marginTop: 2,
            fontFamily: "Inter18pt-Regular",
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tickets',
            tabBarIcon: ({ color, focused }) => (
              <FontAwesomeIcon
                icon={focused ? faHouseSolid : faHouseRegular}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="capture"
          options={{
            tabBarButton: () => (
              <View className="items-center justify-center">
                <Pressable
                  className="rounded-full p-4 -top-2"
                  style={{
                    backgroundColor: Colors[colorScheme ?? 'light'].tint,
                    ...perfect.boxShadow,
                  }}
                  onPress={handleCameraPress}
                >
                  <FontAwesomeIcon
                    icon={faCameraSolid}
                    size={24}
                    color="white"
                  />
                </Pressable>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
            }
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <FontAwesomeIcon
                icon={focused ? faCogSolid : faCogRegular}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      <CaptureModal isVisible={cameraVisible} setIsVisible={setCameraVisible} />
    </>
  );
}
