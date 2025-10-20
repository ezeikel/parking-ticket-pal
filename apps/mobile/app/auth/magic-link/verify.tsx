import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle, faExclamationCircle } from '@fortawesome/pro-regular-svg-icons';
import { verifyMagicLink } from '@/api';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const MagicLinkVerify = () => {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your magic link...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid magic link. Please request a new one.');
      return;
    }

    const verify = async () => {
      try {
        const { sessionToken } = await verifyMagicLink(token);

        if (sessionToken) {
          await SecureStore.setItemAsync('sessionToken', sessionToken);
          setStatus('success');
          setMessage('Successfully verified! Redirecting...');

          // Redirect to home after a short delay
          setTimeout(() => {
            router.replace('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Invalid or expired magic link. Please request a new one.');
        }
      } catch (error) {
        console.error('Magic link verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center gap-y-6">
          {status === 'verifying' && (
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          )}
          {status === 'success' && (
            <FontAwesomeIcon
              icon={faCheckCircle}
              size={64}
              color="#10b981"
            />
          )}
          {status === 'error' && (
            <FontAwesomeIcon
              icon={faExclamationCircle}
              size={64}
              color="#ef4444"
            />
          )}

          <Text className="font-inter text-2xl font-semibold text-gray-800 text-center">
            {status === 'verifying' && 'Verifying Magic Link'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Verification Failed'}
          </Text>

          <Text className="font-inter text-base text-gray-600 text-center">
            {message}
          </Text>

          {status === 'error' && (
            <Text
              className="font-inter text-base text-blue-600 underline mt-4"
              onPress={() => router.replace('/sign-in')}
            >
              Return to sign in
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MagicLinkVerify;
