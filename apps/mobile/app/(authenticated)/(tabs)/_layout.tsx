import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCarMirrors as faCarMirrorsRegular, faHouse as faHouseRegular, faCreditCard as faCreditCardRegular, faUser as faUserRegular, faXmark } from "@fortawesome/pro-regular-svg-icons";
import { faCarMirrors as faCarMirrorsSolid, faHouse as faHouseSolid, faCamera as faCameraSolid, faCreditCard as faCreditCardSolid, faUser as faUserSolid } from "@fortawesome/pro-solid-svg-icons";
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
          name="vehicles"
          options={{
            title: 'Vehicles',
            tabBarIcon: ({ color, focused }) => (
              <FontAwesomeIcon
                icon={focused ? faCarMirrorsSolid : faCarMirrorsRegular}
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
          name="payments"
          options={{
            title: "Payments",
            tabBarIcon: ({ color, focused }) => (
              <FontAwesomeIcon
                icon={focused ? faCreditCardSolid : faCreditCardRegular}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: "Me",
            tabBarIcon: ({ color, focused }) => (
              <FontAwesomeIcon
                icon={focused ? faUserSolid : faUserRegular}
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
