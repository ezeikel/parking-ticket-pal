import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCarMirrors as faCarMirrorsRegular, faHouse as faHouseRegular, faCreditCard as faCreditCardRegular, faUser as faUserRegular, faHouse } from "@fortawesome/pro-regular-svg-icons";
import { faCarMirrors as faCarMirrorsSolid, faHouse as faHouseSolid, faCamera as faCameraSolid, faCreditCard as faCreditCardSolid, faUser as faUserSolid } from "@fortawesome/pro-solid-svg-icons";
import tw from "twrnc";
import { perfect } from "@/styles";
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
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
          tabBarIcon: ({ color, focused }) => (
            <View style={tw.style(`rounded-full p-4 -top-2`, {
              backgroundColor: Colors[colorScheme ?? 'light'].tint,
              ...perfect.boxShadow,
            })}>
              <FontAwesomeIcon
                icon={faCameraSolid}
                size={24}
                color="white"
              />
            </View>
          ),
          tabBarLabel: () => null,
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
              style={tw`text-6xl text-red-100`}
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
  );
}
