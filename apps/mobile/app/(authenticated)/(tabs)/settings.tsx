import { Text, View, ScrollView, Alert, Dimensions } from 'react-native';
import Switch from '@/components/Switch/Switch';
import { SafeAreaView } from 'react-native-safe-area-context';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSignOut, faUser, faEnvelope, faInfoCircle, faHeart, faBookOpen, faTrashCan, faCrown, faRotateRight, faPencil, faPlus, faSignature, faBell as faBellRegular, faComment } from "@fortawesome/pro-regular-svg-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from '@gorhom/bottom-sheet';
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
import { EditableAddress } from '@/components/EditableAddress';
import SignatureBottomSheet from '@/components/SignatureBottomSheet';
import SignatureSvg from '@/components/SignatureSvg';
import EditableNameBottomSheet from '@/components/EditableNameBottomSheet';
import EditableEmailBottomSheet from '@/components/EditableEmailBottomSheet';
import EditablePhoneNumberBottomSheet from '@/components/EditablePhoneNumberBottomSheet';
import EditableAddressBottomSheet from '@/components/EditableAddressBottomSheet';
import { updateUser } from '@/api';
import type { Address } from '@parking-ticket-pal/types';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/api/useNotificationPreferences';
import NotificationBell from '@/components/NotificationBell';
import { AdBanner } from '@/components/AdBanner';

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
  const { trackEvent } = useAnalytics();
  const [isRestoring, setIsRestoring] = useState(false);
  const signatureBottomSheetRef = useRef<BottomSheet>(null);
  const nameBottomSheetRef = useRef<BottomSheet>(null);
  const emailBottomSheetRef = useRef<BottomSheet>(null);
  const phoneBottomSheetRef = useRef<BottomSheet>(null);
  const addressBottomSheetRef = useRef<BottomSheet>(null);

  // Notification preferences
  const { data: preferencesData } = useNotificationPreferences();
  const { mutate: updatePreferences } = useUpdateNotificationPreferences();
  const preferences = preferencesData?.preferences || {
    inApp: true,
    email: true,
    sms: true,
    push: true,
  };

  const appVersion = Constants.expoConfig?.version || '0.1.0';
  const isDev = __DEV__;


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

  const handleUpdateName = async (name: string) => {
    if (!user?.id) return;

    trackEvent("name_updated", { screen: "settings" });
    await updateUser(user.id, { name });
    await refetch();
    nameBottomSheetRef.current?.close();
  };

  const handleUpdatePhoneNumber = async (phoneNumber: string) => {
    if (!user?.id) return;

    trackEvent("phone_number_updated", { screen: "settings" });
    await updateUser(user.id, { phoneNumber });
    await refetch();
    phoneBottomSheetRef.current?.close();
  };

  const handleUpdateAddress = async (address: Address) => {
    if (!user?.id) return;

    trackEvent("address_updated", { screen: "settings" });
    await updateUser(user.id, { address });
    await refetch();
    addressBottomSheetRef.current?.close();
  };

  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [signatureRefreshKey, setSignatureRefreshKey] = useState(0);

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!user?.id) return;

    try {
      trackEvent("signature_updated", { screen: "settings" });
      signatureBottomSheetRef.current?.close();
      setIsEditingSignature(false);

      await updateUser(user.id, { signatureDataUrl });
      await refetch();

      // Force SignatureSvg to remount with fresh data
      setSignatureRefreshKey(prev => prev + 1);

      Alert.alert('Success', 'Signature updated successfully');
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const handleCancelSignature = () => {
    signatureBottomSheetRef.current?.close();
    setIsEditingSignature(false);
  };

  const handleOpenSignatureSheet = () => {
    trackEvent("signature_sheet_opened", { screen: "settings" });
    setIsEditingSignature(true);
    signatureBottomSheetRef.current?.expand();
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

  const handleToggleNotification = (key: 'inApp' | 'email' | 'sms' | 'push') => {
    // Check if user is trying to enable email/sms without subscription
    if (!hasActiveSubscription && (key === 'email' || key === 'sms')) {
      Alert.alert(
        'Upgrade Required',
        `${key === 'email' ? 'Email' : 'SMS'} notifications are only available for Standard and Premium subscribers.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // When toggling push, also toggle inApp to keep them in sync
    if (key === 'push') {
      updatePreferences({
        ...preferences,
        push: !preferences.push,
        inApp: !preferences.push,
      });
    } else {
      updatePreferences({
        ...preferences,
        [key]: !preferences[key],
      });
    }
  };

  const SettingRow = ({ icon, title, value, onPress, destructive = false }: {
    icon: any;
    title: string;
    value?: string;
    onPress?: () => void;
    destructive?: boolean;
  }) => {
    const content = (
      <>
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
      </>
    );

    if (onPress) {
      return (
        <SquishyPressable
          className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
          onPress={onPress}
        >
          {content}
        </SquishyPressable>
      );
    }

    return (
      <View className="flex-row items-center p-4 border-b border-gray-100">
        {content}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900">
            Settings
          </Text>
          <NotificationBell />
        </View>
      </View>

      <AdBanner placement="settings" />

      <View className="flex-1 bg-gray-50">
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
              onPress={() => {
                trackEvent("name_sheet_opened", { screen: "settings" });
                nameBottomSheetRef.current?.expand();
              }}
            />

            <SettingRow
              icon={faEnvelope}
              title="Email"
              value={user?.email}
              onPress={() => {
                trackEvent("email_sheet_opened", { screen: "settings" });
                emailBottomSheetRef.current?.expand();
              }}
            />

            <EditablePhoneNumber
              phoneNumber={user?.phoneNumber}
              onPress={() => {
                trackEvent("phone_sheet_opened", { screen: "settings" });
                phoneBottomSheetRef.current?.expand();
              }}
            />

            <EditableAddress
              address={user?.address}
              onPress={() => {
                trackEvent("address_sheet_opened", { screen: "settings" });
                addressBottomSheetRef.current?.expand();
              }}
            />

            <SquishyPressable
              className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
              onPress={handleOpenSignatureSheet}
            >
              <FontAwesomeIcon
                icon={faSignature}
                size={20}
                color={Colors[colorScheme ?? 'light'].text}
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="font-inter text-base text-gray-900">
                  Signature
                </Text>
                {user?.signatureUrl ? (
                  <View className="mt-2">
                    <SignatureSvg
                      uri={user.signatureUrl}
                      width={150}
                      height={50}
                      refreshTrigger={signatureRefreshKey}
                    />
                  </View>
                ) : (
                  <Text className="font-inter text-sm text-gray-400 mt-1">
                    Not set
                  </Text>
                )}
              </View>
              <FontAwesomeIcon
                icon={faPencil}
                size={16}
                color={Colors[colorScheme ?? 'light'].tint}
              />
            </SquishyPressable>

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

            <SquishyPressable
              className="flex-row items-center p-4 border-t border-gray-100 active:bg-gray-50"
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <View style={{ marginRight: 12 }}>
                  <Loader size={20} color={Colors[colorScheme ?? 'light'].text} />
                </View>
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
            </SquishyPressable>
          </View>

          {/* Notification Preferences Section */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-inter text-lg font-semibold text-gray-900 mb-2">
                Notification Preferences
              </Text>
              <Text className="font-inter text-sm text-gray-600">
                Choose how you want to receive notifications about your tickets
              </Text>
            </View>

            {/* Push Notifications */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <FontAwesomeIcon
                  icon={faBellRegular}
                  size={20}
                  color={Colors[colorScheme ?? 'light'].text}
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className="font-inter text-base text-gray-900">
                    Push Notifications
                  </Text>
                  <Text className="font-inter text-xs text-gray-500 mt-1">
                    Get notified in-app and when app is closed
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.push && preferences.inApp}
                onValueChange={() => handleToggleNotification('push')}
                trackColors={{ off: '#d1d5db', on: '#16a34a' }}
              />
            </View>

            {/* Email Notifications */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  size={20}
                  color={hasActiveSubscription ? Colors[colorScheme ?? 'light'].text : '#9ca3af'}
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`font-inter text-base ${hasActiveSubscription ? 'text-gray-900' : 'text-gray-400'}`}>
                      Email Notifications
                    </Text>
                    {!hasActiveSubscription && (
                      <View className="ml-2 bg-purple-100 rounded-full px-2 py-0.5">
                        <Text className="font-inter text-xs text-purple-700 font-semibold">
                          Premium
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-inter text-xs text-gray-500 mt-1">
                    {hasActiveSubscription ? 'Get email alerts' : 'Available for Standard & Premium'}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.email && hasActiveSubscription}
                onValueChange={() => handleToggleNotification('email')}
                disabled={!hasActiveSubscription}
                trackColors={{ off: '#d1d5db', on: '#16a34a' }}
              />
            </View>

            {/* SMS Notifications */}
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1">
                <FontAwesomeIcon
                  icon={faComment}
                  size={20}
                  color={hasActiveSubscription ? Colors[colorScheme ?? 'light'].text : '#9ca3af'}
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`font-inter text-base ${hasActiveSubscription ? 'text-gray-900' : 'text-gray-400'}`}>
                      SMS Notifications
                    </Text>
                    {!hasActiveSubscription && (
                      <View className="ml-2 bg-purple-100 rounded-full px-2 py-0.5">
                        <Text className="font-inter text-xs text-purple-700 font-semibold">
                          Premium
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-inter text-xs text-gray-500 mt-1">
                    {hasActiveSubscription ? 'Get text message alerts' : 'Available for Standard & Premium'}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.sms && hasActiveSubscription}
                onValueChange={() => handleToggleNotification('sms')}
                disabled={!hasActiveSubscription}
                trackColors={{ off: '#d1d5db', on: '#16a34a' }}
              />
            </View>
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
      </View>

      <EditableNameBottomSheet
        ref={nameBottomSheetRef}
        currentName={user?.name}
        onSave={handleUpdateName}
        onCancel={() => nameBottomSheetRef.current?.close()}
      />

      <EditableEmailBottomSheet
        ref={emailBottomSheetRef}
        email={user?.email || ''}
        onClose={() => emailBottomSheetRef.current?.close()}
      />

      <EditablePhoneNumberBottomSheet
        ref={phoneBottomSheetRef}
        phoneNumber={user?.phoneNumber}
        onSave={handleUpdatePhoneNumber}
        onCancel={() => phoneBottomSheetRef.current?.close()}
      />

      <EditableAddressBottomSheet
        ref={addressBottomSheetRef}
        address={user?.address}
        onSave={handleUpdateAddress}
        onCancel={() => addressBottomSheetRef.current?.close()}
      />

      <SignatureBottomSheet
        ref={signatureBottomSheetRef}
        onSave={handleSaveSignature}
        onCancel={handleCancelSignature}
        existingSignatureUrl={user?.signatureUrl}
      />
    </SafeAreaView>
  );
};

export default SettingsScreen;
