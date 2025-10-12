import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSignOut, faUser, faEnvelope, faInfoCircle, faHeart } from "@fortawesome/pro-regular-svg-icons";
import { useAuthContext } from '@/contexts/auth';
import useUser from '@/hooks/api/useUser';
import { Typography } from '@/components/Typography/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import Loader from '@/components/Loader/Loader';
import { useAnalytics } from '@/lib/analytics';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const SettingsScreen = () => {
  const { data, isLoading } = useUser();
  const user = data?.user;
  const { signOut } = useAuthContext();
  const colorScheme = useColorScheme();
  const { trackScreenView, trackEvent } = useAnalytics();

  const appVersion = Constants.expoConfig?.version || '0.1.0';

  useFocusEffect(
    useCallback(() => {
      trackScreenView('settings');
      trackEvent("settings_viewed", { screen: "settings" });
    }, [])
  );

  const handleSignOut = () => {
    trackEvent("auth_sign_out", { screen: "settings" });
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const SettingRow = ({ icon, title, value, onPress, destructive = false }: {
    icon: any;
    title: string;
    value?: string;
    onPress?: () => void;
    destructive?: boolean;
  }) => (
    <Pressable
      className={`flex-row items-center p-4 border-b border-gray-100 ${
        onPress ? 'active:bg-gray-50' : ''
      }`}
      onPress={onPress}
    >
      <FontAwesomeIcon
        icon={icon}
        size={20}
        color={destructive ? '#ef4444' : Colors[colorScheme ?? 'light'].text}
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className={`font-inter text-base ${
          destructive ? 'text-red-500' : 'text-gray-900'
        }`}>
          {title}
        </Text>
        {value && (
          <Text className="font-inter text-sm text-gray-500 mt-1">
            {value}
          </Text>
        )}
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
          alignSelf: 'center',
        }}
      >

        <ScrollView className="flex-1">
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                Account
              </Text>
            </View>

            <SettingRow
              icon={faUser}
              title="Name"
              value={user?.name || 'Not set'}
            />

            <SettingRow
              icon={faEnvelope}
              title="Email"
              value={user?.email}
            />
          </View>

          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                App Information
              </Text>
            </View>

            <SettingRow
              icon={faInfoCircle}
              title="Version"
              value={appVersion}
            />
          </View>

          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <SettingRow
              icon={faSignOut}
              title="Sign Out"
              onPress={handleSignOut}
              destructive={true}
            />
          </View>

          <View className="items-center pb-6">
            <View className="flex-row items-center">
              <Text className="font-inter text-xs text-gray-400">
                Made with{' '}
              </Text>
              <FontAwesomeIcon icon={faHeart} size={12} color="#ef4444" />
              <Text className="font-inter text-xs text-gray-400">
                {' '}in{' '}
              </Text>
              <Text className="font-inter text-xs text-gray-600 font-medium">
                South London
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
