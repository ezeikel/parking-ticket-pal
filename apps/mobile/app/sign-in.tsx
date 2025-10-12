import { View, Dimensions, Text, Pressable, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faApple, faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useAuthContext } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useState } from 'react';
import { useAnalytics } from '@/lib/analytics';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const AuthScreen = () => {
  const { signIn } = useAuthContext();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackScreenView, trackEvent, trackError } = useAnalytics();

  useFocusEffect(
    useCallback(() => {
      trackScreenView('sign_in');
    }, [])
  );

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    trackEvent("auth_magic_link_requested", {
      screen: "sign_in",
      auth_method: "magic_link"
    });

    setIsLoading(true);
    try {
      // TODO: Implement magic link API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      Alert.alert('Success', `Magic link sent to ${email}`);
    } catch (error) {
      trackError(error as Error, {
        screen: "sign_in",
        action: "magic_link",
        errorType: "network"
      });
      Alert.alert('Error', 'Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      trackEvent("auth_sign_in_started", {
        screen: "sign_in",
        auth_method: "google"
      });

      await signIn();

      trackEvent("auth_sign_in_success", {
        screen: "sign_in",
        auth_method: "google"
      });

      router.replace('/');
    } catch (error) {
      trackEvent("auth_sign_in_failed", {
        screen: "sign_in",
        auth_method: "google",
        error_message: error instanceof Error ? error.message : "Unknown error"
      });
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    trackEvent("auth_sign_in_started", {
      screen: "sign_in",
      auth_method: "apple"
    });
    Alert.alert('Coming Soon', 'Apple Sign-In will be available soon.');
  };

  const handleFacebookSignIn = async () => {
    trackEvent("auth_sign_in_started", {
      screen: "sign_in",
      auth_method: "facebook"
    });
    Alert.alert('Coming Soon', 'Facebook Sign-In will be available soon.');
  };

  const SocialButton = ({ icon, label, onPress, backgroundColor, textColor, borderColor }: {
    icon: any;
    label: string;
    onPress: () => void;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center py-4 px-6 rounded-xl mb-3 border gap-x-4"
      style={{
        backgroundColor: backgroundColor || '#ffffff',
        borderColor: borderColor || '#e5e7eb',
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        size={20}
        color={textColor || '#374151'}
      />
      <Text
        className="font-inter font-medium text-base"
        style={{ color: textColor || '#374151' }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View
        className="flex-1 justify-center"
        style={{
          width: screenWidth,
          alignSelf: 'center',
          paddingHorizontal: padding,
        }}
      >
        {/* Logo */}
        <View className="items-center mb-8">
          <Image
            source={require('../assets/logos/ptp.png')}
            style={{ width: 80, height: 80, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text className="font-inter text-2xl font-medium text-gray-800 text-center">
            Login or signup
          </Text>
        </View>

        {/* Email Input */}
        <View className="mb-6">
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-4 font-inter text-base bg-white"
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {/* Continue Button */}
        <Pressable
          onPress={handleContinue}
          disabled={isLoading}
          className="py-4 rounded-xl flex-row items-center justify-center mb-8"
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-inter font-semibold text-white text-base">
              Continue
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="font-inter text-sm text-gray-500 mx-4">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Social Auth Buttons */}
        <View className="mb-8">
          <SocialButton
            icon={faGoogle}
            label="Continue with Google"
            onPress={handleGoogleSignIn}
          />

          <SocialButton
            icon={faApple}
            label="Continue with Apple"
            onPress={handleAppleSignIn}
            backgroundColor="#000000"
            textColor="#ffffff"
            borderColor="#000000"
          />

          <SocialButton
            icon={faFacebook}
            label="Continue with Facebook"
            onPress={handleFacebookSignIn}
            backgroundColor="#1877f2"
            textColor="#ffffff"
            borderColor="#1877f2"
          />
        </View>

        {/* Footer */}
        <Text className="font-inter text-xs text-gray-500 text-center leading-5">
          By continuing, you agree to our{' '}
          <Text className="underline">Terms of Service</Text> and{' '}
          <Text className="underline">Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default AuthScreen;