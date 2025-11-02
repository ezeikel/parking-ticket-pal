import { Text, View, ScrollView, Pressable, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSignOut, faUser, faEnvelope, faInfoCircle, faHeart, faBookOpen, faTrashCan, faCrown, faRotateRight } from "@fortawesome/pro-regular-svg-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '@/contexts/auth';
import { usePurchases } from '@/contexts/purchases';
import useUser from '@/hooks/api/useUser';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import Loader from '@/components/Loader/Loader';
import { useAnalytics } from '@/lib/analytics';
import { resetOnboarding } from '@/utils/onboarding';
import { UpgradeButton } from '@/components/UpgradeButton';
import { EditablePhoneNumber } from '@/components/EditablePhoneNumber';
import { updateUser } from '@/api';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const SettingsScreen = () => {
  const { data, isLoading, refetch } = useUser();
  const user = data?.user;
  const { signOut } = useAuthContext();
  const {
    hasActiveSubscription,
    hasPremiumAccess,
    hasStandardAccess,
    restorePurchases,
    refreshCustomerInfo
  } = usePurchases();
  const colorScheme = useColorScheme();
  const { trackScreenView, trackEvent } = useAnalytics();
  const [isRestoring, setIsRestoring] = useState(false);

  const appVersion = Constants.expoConfig?.version || '0.1.0';
  const isDev = __DEV__;

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

  const handleViewOnboarding = async () => {
    try {
      await resetOnboarding();
      trackEvent("onboarding_viewed_from_settings", { screen: "settings" });
      router.push('/onboarding');
    } catch (error) {
      Alert.alert('Error', 'Failed to navigate to onboarding');
    }
  };

  const handleClearAppData = () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all locally stored data including onboarding status, preferences, and cached data. You will need to sign in again. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              trackEvent("dev_clear_app_data", { screen: "settings" });
              await AsyncStorage.clear();
              Alert.alert('Success', 'App data cleared. Please restart the app.', [
                {
                  text: 'Sign Out Now',
                  onPress: signOut,
                }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear app data');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePhoneNumber = async (phoneNumber: string) => {
    if (!user?.id) return;

    trackEvent("phone_number_updated", { screen: "settings" });
    await updateUser(user.id, { phoneNumber });
    await refetch();
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    trackEvent("restore_purchases_tapped", { screen: "settings" });

    try {
      const customerInfo = await restorePurchases();
      await refreshCustomerInfo();

      const hasEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasEntitlements) {
        Alert.alert(
          'Success',
          'Your purchases have been restored successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We could not find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert(
        'Error',
        'Failed to restore purchases. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (user?.subscription?.source === 'STRIPE') {
      const type = user.subscription.type === 'PREMIUM' ? 'Premium' : 'Standard';
      return `${type} (Web Subscription)`;
    }

    if (hasPremiumAccess) {
      return 'Premium (Mobile)';
    }

    if (hasStandardAccess) {
      return 'Standard (Mobile)';
    }

    return 'Free';
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
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

            <EditablePhoneNumber
              phoneNumber={user?.phoneNumber}
              onSave={handleUpdatePhoneNumber}
            />

            <SettingRow
              icon={faCrown}
              title="Subscription"
              value={getSubscriptionStatus()}
            />
          </View>

          {/* Subscription Section */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                Subscription & Purchases
              </Text>
            </View>

            {user?.subscription?.source === 'STRIPE' ? (
              <View className="p-4">
                <Text className="font-inter text-sm text-gray-600 mb-3">
                  You have a web subscription. To manage your subscription, please visit the website.
                </Text>
              </View>
            ) : (
              <View className="p-4">
                {!hasActiveSubscription && (
                  <>
                    <Text className="font-inter text-sm text-gray-600 mb-3">
                      Unlock unlimited tickets and premium features
                    </Text>
                    <UpgradeButton fullWidth variant="primary" />
                  </>
                )}

                {hasActiveSubscription && !hasPremiumAccess && (
                  <>
                    <Text className="font-inter text-sm text-gray-600 mb-3">
                      Upgrade to Premium for more features
                    </Text>
                    <UpgradeButton fullWidth variant="primary" />
                  </>
                )}

                {hasPremiumAccess && (
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Text className="font-inter text-sm text-blue-700 text-center">
                      You have Premium access
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Pressable
              className="flex-row items-center p-4 border-t border-gray-100 active:bg-gray-50"
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].text} style={{ marginRight: 12 }} />
              ) : (
                <FontAwesomeIcon
                  icon={faRotateRight}
                  size={20}
                  color={Colors[colorScheme ?? 'light'].text}
                  style={{ marginRight: 12 }}
                />
              )}
              <Text className="font-inter text-base text-gray-900">
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </View>

          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                App Information
              </Text>
            </View>

            <SettingRow
              icon={faBookOpen}
              title="View Onboarding"
              onPress={handleViewOnboarding}
            />

            <SettingRow
              icon={faInfoCircle}
              title="Version"
              value={`${Application.nativeApplicationVersion || appVersion}${Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}`}
            />
          </View>

          {isDev && (
            <View className="bg-white rounded-lg mb-6 overflow-hidden">
              <View className="p-4 border-b border-gray-100">
                <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                  Developer Tools
                </Text>
              </View>
              <SettingRow
                icon={faTrashCan}
                title="Clear App Data"
                onPress={handleClearAppData}
                destructive={true}
              />
            </View>
          )}

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
