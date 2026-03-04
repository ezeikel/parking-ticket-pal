import { View, Text, TextInput, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faApple, faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useState } from 'react';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type SocialAuthButtonsProps = {
  onGoogle: () => void;
  onApple: () => void;
  onFacebook: () => void;
  onMagicLink: (email: string, password?: string) => void;
  disabled?: boolean;
  showMagicLink?: boolean;
  showFacebook?: boolean;
};

const SocialAuthButtons = ({
  onGoogle,
  onApple,
  onFacebook,
  onMagicLink,
  disabled = false,
  showMagicLink = true,
  showFacebook = true,
}: SocialAuthButtonsProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View>
      <SquishyPressable
        className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
        onPress={onGoogle}
        disabled={disabled}
      >
        <FontAwesomeIcon icon={faGoogle as unknown as import('@fortawesome/fontawesome-svg-core').IconDefinition} size={20} color="#EA4335" style={{ marginRight: 12 }} />
        <Text className="font-jakarta text-base text-gray-900">Continue with Google</Text>
      </SquishyPressable>

      {Platform.OS === 'ios' && (
        <SquishyPressable
          className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
          onPress={onApple}
          disabled={disabled}
        >
          <FontAwesomeIcon icon={faApple as unknown as import('@fortawesome/fontawesome-svg-core').IconDefinition} size={20} color="#000000" style={{ marginRight: 12 }} />
          <Text className="font-jakarta text-base text-gray-900">Continue with Apple</Text>
        </SquishyPressable>
      )}

      {showFacebook && (
        <SquishyPressable
          className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
          onPress={onFacebook}
          disabled={disabled}
        >
          <FontAwesomeIcon icon={faFacebook as unknown as import('@fortawesome/fontawesome-svg-core').IconDefinition} size={20} color="#1877F2" style={{ marginRight: 12 }} />
          <Text className="font-jakarta text-base text-gray-900">Continue with Facebook</Text>
        </SquishyPressable>
      )}

      {showMagicLink && (
        <View className="p-4">
          <View className="flex-row items-center mb-3">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="font-jakarta text-xs text-gray-400 mx-3">or</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>
          <View className="gap-y-2">
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 font-jakarta text-sm"
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {email.toLowerCase() === 'testreviewer@parkingticketpal.com' && (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 font-jakarta text-sm"
                placeholder="Password (optional)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            )}
            <SquishyPressable
              className="bg-gray-900 rounded-lg px-4 py-3 items-center"
              onPress={() => onMagicLink(email, password || undefined)}
              disabled={disabled}
            >
              <Text className="font-jakarta-medium text-sm text-white">Send Link</Text>
            </SquishyPressable>
          </View>
        </View>
      )}
    </View>
  );
};

export default SocialAuthButtons;
