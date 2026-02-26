import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle, faExclamationCircle } from '@fortawesome/pro-regular-svg-icons';
import { verifyMagicLink } from '@/api';
import { getDeviceId, setSessionToken } from '@/lib/auth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Loader from '@/components/Loader/Loader';

const MagicLinkVerify = () => {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { replace, back } = useRouter();
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
        const deviceId = await getDeviceId();
        const { sessionToken } = await verifyMagicLink(token, deviceId);

        if (sessionToken) {
          await setSessionToken(sessionToken);
          setStatus('success');
          setMessage('Successfully verified! Redirecting...');

          setTimeout(() => {
            replace('/(authenticated)/(tabs)');
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
  }, [token, replace]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center gap-y-6">
          {status === 'verifying' && (
            <Loader size={64} color={Colors[colorScheme ?? 'light'].tint} />
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

          <Text className="font-jakarta-semibold text-2xl text-gray-800 text-center">
            {status === 'verifying' && 'Verifying Magic Link'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Verification Failed'}
          </Text>

          <Text className="font-jakarta text-base text-gray-600 text-center">
            {message}
          </Text>

          {status === 'error' && (
            <Text
              className="font-jakarta text-base text-teal underline mt-4"
              onPress={() => back()}
            >
              Go back
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MagicLinkVerify;
