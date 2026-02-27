import { View, Text, TextInput } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faApple, faFacebook, faGoogle, type IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { useState } from 'react';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type SocialAuthButtonsProps = {
  onGoogle: () => void;
  onApple: () => void;
  onFacebook: () => void;
  onMagicLink: (email: string) => void;
  disabled?: boolean;
  showMagicLink?: boolean;
};

const SocialAuthButtons = ({
  onGoogle,
  onApple,
  onFacebook,
  onMagicLink,
  disabled = false,
  showMagicLink = true,
}: SocialAuthButtonsProps) => {
  const [email, setEmail] = useState('');

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

      <SquishyPressable
        className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
        onPress={onApple}
        disabled={disabled}
      >
        <FontAwesomeIcon icon={faApple as unknown as import('@fortawesome/fontawesome-svg-core').IconDefinition} size={20} color="#000000" style={{ marginRight: 12 }} />
        <Text className="font-jakarta text-base text-gray-900">Continue with Apple</Text>
      </SquishyPressable>

      <SquishyPressable
        className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
        onPress={onFacebook}
        disabled={disabled}
      >
        <FontAwesomeIcon icon={faFacebook as unknown as import('@fortawesome/fontawesome-svg-core').IconDefinition} size={20} color="#1877F2" style={{ marginRight: 12 }} />
        <Text className="font-jakarta text-base text-gray-900">Continue with Facebook</Text>
      </SquishyPressable>

      {showMagicLink && (
        <View className="p-4">
          <View className="flex-row items-center mb-3">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="font-jakarta text-xs text-gray-400 mx-3">or</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>
          <View className="flex-row items-center gap-x-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-3 py-3 font-jakarta text-sm"
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <SquishyPressable
              className="bg-gray-900 rounded-lg px-4 py-3"
              onPress={() => onMagicLink(email)}
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
