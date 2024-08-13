import { Tabs } from 'expo-router';
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faClock as faClockRegular, faTicketsPerforated as faTicketsPerforatedRegular, faCamera as faCameraRegular, faClipboardListCheck as faClipboardListCheckRegular, faUser as faUserRegular } from "@fortawesome/pro-regular-svg-icons";
import { faClock as faClockSolid, faTicketsPerforated as faTicketsPerforatedSolid, faCamera as faCameraSolid, faClipboardListCheck as faClipboardListCheckSolid, faUser as faUserSolid } from "@fortawesome/pro-solid-svg-icons";
import tw from "twrnc";
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recents',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesomeIcon
              icon={focused ? faClockSolid : faClockRegular}
              size={20}
              // style={tw`text-3xl text-black`}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesomeIcon
              icon={focused ? faTicketsPerforatedSolid : faTicketsPerforatedRegular}
              size={20}
              // style={tw`text-3xl text-black`}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <FontAwesomeIcon
              icon={focused ? faCameraSolid : faCameraRegular}
              size={20}
              // style={tw`text-3xl text-black`}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="outstanding"
        options={{
          title: "Outstanding",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesomeIcon
              icon={focused ? faClipboardListCheckSolid : faClipboardListCheckRegular}
              size={20}
              // style={tw`text-3xl text-black`}
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
              size={20}
              // style={tw`text-3xl text-black`}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
