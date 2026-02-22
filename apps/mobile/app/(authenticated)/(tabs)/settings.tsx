import { Text, View, ScrollView, Alert, useWindowDimensions, Linking, Platform } from 'react-native';
import { toast } from '@/lib/toast';
import Switch from '@/components/Switch/Switch';
import { SafeAreaView } from 'react-native-safe-area-context';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { useState, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSignOut, faUser, faEnvelope, faInfoCircle, faHeart, faBookOpen, faTrashCan, faCrown, faRotateRight, faPencil, faSignature, faBell as faBellRegular, faComment, faCircleQuestion, faStar, faShieldCheck, faFileLines } from "@fortawesome/pro-regular-svg-icons";
import SocialAuthButtons from '@/components/SocialAuthButtons/SocialAuthButtons';
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
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/api/useNotificationPreferences';
import NotificationBell from '@/components/NotificationBell';
import { AdBanner } from '@/components/AdBanner';

const padding = 16;

const SettingsScreen = () => {
  const { width } = useWindowDimensions();
  const screenWidth = width - padding * 2;
  const { data, isLoading, refetch } = useUser();
  const user = data?.user;
  const { signOut, isLinked, signIn, signInWithApple: signInWithAppleMethod, signInWithFacebook: signInWithFacebookMethod, sendMagicLink } = useAuthContext();
  const {
    hasActiveSubscription,
    hasPremiumAccess,
    hasStandardAccess,
    restorePurchases,
    refreshCustomerInfo
  } = usePurchases();
  const colorScheme = useColorScheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
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

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      trackEvent("link_account_started", { screen: "settings", method: "google" });
      await signIn();
      trackEvent("link_account_success", { screen: "settings", method: "google" });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      trackEvent("link_account_failed", { screen: "settings", method: "google" });
      toast.error('Link Failed', 'Could not connect Google account');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkApple = async () => {
    setIsLinking(true);
    try {
      trackEvent("link_account_started", { screen: "settings", method: "apple" });
      await signInWithAppleMethod();
      trackEvent("link_account_success", { screen: "settings", method: "apple" });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      trackEvent("link_account_failed", { screen: "settings", method: "apple" });
      toast.error('Link Failed', 'Could not connect Apple account');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkFacebook = async () => {
    setIsLinking(true);
    try {
      trackEvent("link_account_started", { screen: "settings", method: "facebook" });
      await signInWithFacebookMethod();
      trackEvent("link_account_success", { screen: "settings", method: "facebook" });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      trackEvent("link_account_failed", { screen: "settings", method: "facebook" });
      toast.error('Link Failed', 'Could not connect Facebook account');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkMagicLink = async (email: string) => {
    if (!email.trim()) {
      toast.error('Email Required', 'Please enter your email address');
      return;
    }
    setIsLinking(true);
    try {
      trackEvent("link_account_started", { screen: "settings", method: "magic_link" });
      await sendMagicLink(email);
      toast.success('Email Sent', 'Check your inbox for the login link');
    } catch (error) {
      trackEvent("link_account_failed", { screen: "settings", method: "magic_link" });
      toast.error('Send Failed', 'Could not send magic link');
    } finally {
      setIsLinking(false);
    }
  };

  const handleViewOnboarding = async () => {
    try {
      await resetOnboarding();
      trackEvent("onboarding_viewed_from_settings", { screen: "settings" });
      router.push('/onboarding');
    } catch (error) {
      toast.error('Error', 'Failed to open onboarding');
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
              toast.error('Error', 'Failed to clear app data');
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

      toast.success('Saved', 'Signature updated');
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Save Failed', 'Could not save signature');
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
        toast.success('Purchases Restored');
      } else {
        toast.info('No Purchases Found', 'No previous purchases on this account');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      toast.error('Restore Failed', 'Please try again later');
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
      toast.info('Upgrade Required', `${key === 'email' ? 'Email' : 'SMS'} notifications are only available for Standard and Premium subscribers.`);
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

  const handleOpenNameSheet = useCallback(() => {
    trackEvent("name_sheet_opened", { screen: "settings" });
    nameBottomSheetRef.current?.expand();
  }, [trackEvent]);

  const handleOpenEmailSheet = useCallback(() => {
    trackEvent("email_sheet_opened", { screen: "settings" });
    emailBottomSheetRef.current?.expand();
  }, [trackEvent]);

  const handleOpenPhoneSheet = useCallback(() => {
    trackEvent("phone_sheet_opened", { screen: "settings" });
    phoneBottomSheetRef.current?.expand();
  }, [trackEvent]);

  const handleOpenAddressSheet = useCallback(() => {
    trackEvent("address_sheet_opened", { screen: "settings" });
    addressBottomSheetRef.current?.expand();
  }, [trackEvent]);

  const handleOpenSubscription = useCallback(() => {
    router.push({ pathname: '/(authenticated)/paywall', params: { mode: 'subscriptions' } });
  }, []);

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
          <Text className={`font-jakarta text-base ${
            destructive ? 'text-red-500' : 'text-gray-900'
          }`}>
            {title}
          </Text>
          {value && (
            <Text className="font-jakarta text-sm text-gray-500 mt-1">
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
          <Text className="text-2xl font-jakarta-bold text-dark">
            Settings
          </Text>
          <NotificationBell />
        </View>
      </View>

      {/* Banner Ad */}
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
          <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
          {/* Account Section */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2">
                Account
              </Text>
            </View>

            <SettingRow
              icon={faUser}
              title="Name"
              value={user?.name || 'Not set'}
              onPress={handleOpenNameSheet}
            />

            <SettingRow
              icon={faEnvelope}
              title="Email"
              value={user?.email || 'Not linked'}
              onPress={user?.email ? handleOpenEmailSheet : undefined}
            />

            <EditablePhoneNumber
              phoneNumber={user?.phoneNumber}
              onPress={handleOpenPhoneSheet}
            />

            <EditableAddress
              address={user?.address}
              onPress={handleOpenAddressSheet}
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
                <Text className="font-jakarta text-base text-gray-900">
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
                  <Text className="font-jakarta text-sm text-gray-400 mt-1">
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

            {/* Subscription - inline in Account */}
            <SettingRow
              icon={faCrown}
              title="Subscription"
              value={getSubscriptionStatus()}
              onPress={!hasPremiumAccess && user?.subscription?.source !== 'STRIPE'
                ? handleOpenSubscription
                : undefined
              }
            />

            {user?.subscription?.source === 'STRIPE' ? (
              <View className="px-4 pb-4">
                <Text className="font-jakarta text-sm text-gray-500">
                  Manage your subscription on the website
                </Text>
              </View>
            ) : (
              <>
                {!hasActiveSubscription && (
                  <View className="px-4 pt-2 pb-4">
                    <UpgradeButton fullWidth variant="primary" />
                  </View>
                )}
                {hasActiveSubscription && !hasPremiumAccess && (
                  <View className="px-4 pt-2 pb-4">
                    <UpgradeButton fullWidth variant="primary" />
                  </View>
                )}
              </>
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
              <Text className="font-jakarta text-base text-gray-900">
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </SquishyPressable>
          </View>

          {/* Link Account Section - shown when user is anonymous */}
          {!isLinked && (
            <View className="bg-white rounded-lg mb-6 overflow-hidden">
              <View className="p-4 border-b border-gray-100">
                <Text className="font-jakarta-semibold text-lg text-gray-900 mb-1">
                  Link Account
                </Text>
                <Text className="font-jakarta text-sm text-gray-500">
                  Link an account to sync your data across devices
                </Text>
              </View>

              <SocialAuthButtons
                onGoogle={handleLinkGoogle}
                onApple={handleLinkApple}
                onFacebook={handleLinkFacebook}
                onMagicLink={handleLinkMagicLink}
                disabled={isLinking}
              />
            </View>
          )}

          {/* Notification Preferences Section */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2">
                Notification Preferences
              </Text>
              <Text className="font-jakarta text-sm text-gray-600">
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
                  <Text className="font-jakarta text-base text-gray-900">
                    Push Notifications
                  </Text>
                  <Text className="font-jakarta text-xs text-gray-500 mt-1">
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
                    <Text className={`font-jakarta text-base ${hasActiveSubscription ? 'text-gray-900' : 'text-gray-400'}`}>
                      Email Notifications
                    </Text>
                    {!hasActiveSubscription && (
                      <View className="ml-2 bg-purple-100 rounded-full px-2 py-0.5">
                        <Text className="font-jakarta-semibold text-xs text-purple-700">
                          Premium
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-jakarta text-xs text-gray-500 mt-1">
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
                    <Text className={`font-jakarta text-base ${hasActiveSubscription ? 'text-gray-900' : 'text-gray-400'}`}>
                      SMS Notifications
                    </Text>
                    {!hasActiveSubscription && (
                      <View className="ml-2 bg-purple-100 rounded-full px-2 py-0.5">
                        <Text className="font-jakarta-semibold text-xs text-purple-700">
                          Premium
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-jakarta text-xs text-gray-500 mt-1">
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

          {/* Support & Legal */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2">
                Support & Legal
              </Text>
            </View>

            <SettingRow
              icon={faCircleQuestion}
              title="Help & FAQ"
              value="Get answers to common questions"
              onPress={() => Linking.openURL('mailto:support@parkingticketpal.com')}
            />

            <SettingRow
              icon={faEnvelope}
              title="Contact Us"
              value="support@parkingticketpal.com"
              onPress={() => Linking.openURL('mailto:support@parkingticketpal.com')}
            />

            <SettingRow
              icon={faStar}
              title="Rate the App"
              value="Share your feedback"
              onPress={() => {
                const storeUrl = Platform.select({
                  ios: 'https://apps.apple.com/app/parking-ticket-pal',
                  android: 'https://play.google.com/store/apps/details?id=com.parkingticketpal',
                });
                if (storeUrl) Linking.openURL(storeUrl);
              }}
            />

            <SettingRow
              icon={faShieldCheck}
              title="Privacy Policy"
              onPress={() => Linking.openURL('https://www.parkingticketpal.com/privacy')}
            />

            <SettingRow
              icon={faFileLines}
              title="Terms of Service"
              onPress={() => Linking.openURL('https://www.parkingticketpal.com/terms')}
            />
          </View>

          {/* App Information */}
          <View className="bg-white rounded-lg mb-6 overflow-hidden">
            <View className="p-4 border-b border-gray-100">
              <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2">
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
                <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2">
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

          {isLinked && (
            <View className="bg-white rounded-lg mb-6 overflow-hidden">
              <SettingRow
                icon={faSignOut}
                title="Sign Out"
                onPress={handleSignOut}
                destructive={true}
              />
            </View>
          )}

          <View className="items-center pb-6">
            <View className="flex-row items-center">
              <Text className="font-jakarta text-xs text-gray-400">
                Made with{' '}
              </Text>
              <FontAwesomeIcon icon={faHeart} size={12} color="#ef4444" />
              <Text className="font-jakarta text-xs text-gray-400">
                {' '}in{' '}
              </Text>
              <Text className="font-jakarta-medium text-xs text-gray-600">
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
