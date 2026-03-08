import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFileLines, faLock, faCrown } from '@fortawesome/pro-solid-svg-icons';
import { IssuerType } from '@/types';
import { getAvailableForms, FORM_TYPES, FormType } from '@/constants/challenges';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type LegalFormsCardProps = {
  isPremium: boolean;
  issuerType: IssuerType;
  onSelectForm: (formType: FormType) => void;
  onUpgrade: () => void;
};

export default function LegalFormsCard({
  isPremium,
  issuerType,
  onSelectForm,
  onUpgrade,
}: LegalFormsCardProps) {
  const availableForms = getAvailableForms(issuerType);

  if (isPremium) {
    return (
      <View className="rounded-2xl border border-border bg-white p-4 mb-4">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-lg bg-light items-center justify-center">
            <FontAwesomeIcon icon={faFileLines} size={18} color="#2D3436" />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-semibold text-lg text-dark">
              Legal Forms
            </Text>
            <Text className="font-jakarta text-sm text-gray">
              Pre-filled forms for later-stage appeals
            </Text>
          </View>
        </View>

        <View className="mt-3 gap-2">
          {availableForms.map((formKey) => {
            const form = FORM_TYPES[formKey];
            return (
              <SquishyPressable
                key={formKey}
                onPress={() => onSelectForm(formKey)}
              >
                <View className="flex-row items-center justify-between rounded-xl border border-border bg-light p-3">
                  <View className="flex-1 mr-3">
                    <Text className="font-jakarta-semibold text-sm text-dark">
                      {form.name}
                    </Text>
                    <Text className="font-jakarta text-xs text-gray mt-0.5">
                      {form.description}
                    </Text>
                  </View>
                  <View className="bg-teal rounded-lg px-3 py-1.5">
                    <Text className="font-jakarta-semibold text-xs text-white">
                      Generate
                    </Text>
                  </View>
                </View>
              </SquishyPressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Non-premium locked state
  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <View className="flex-row items-center gap-3 mb-1">
        <View className="w-10 h-10 rounded-lg bg-light items-center justify-center">
          <FontAwesomeIcon icon={faFileLines} size={18} color="#2D3436" />
        </View>
        <View className="flex-1">
          <Text className="font-jakarta-semibold text-lg text-dark">
            Legal Forms
          </Text>
          <Text className="font-jakarta text-sm text-gray">
            Pre-filled forms for later-stage appeals
          </Text>
        </View>
      </View>

      {/* Form pills */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        {['PE2', 'PE3', 'TE7', 'TE9', 'N244'].map((form) => (
          <View
            key={form}
            className="rounded-full bg-light px-3 py-1"
          >
            <Text className="font-jakarta-medium text-xs text-dark">
              {form}
            </Text>
          </View>
        ))}
      </View>

      {/* Premium upsell */}
      <View
        className="mt-3 rounded-xl p-4"
        style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}
      >
        <View className="flex-row items-center gap-2">
          <FontAwesomeIcon icon={faLock} size={12} color="#D97706" />
          <Text
            className="font-jakarta-semibold text-sm"
            style={{ color: '#92400E' }}
          >
            Premium Feature
          </Text>
          <FontAwesomeIcon icon={faCrown} size={10} color="#F59E0B" />
        </View>
        <Text
          className="font-jakarta text-sm mt-2"
          style={{ color: '#B45309' }}
        >
          Upgrade to Premium to generate pre-filled legal forms with your
          details and AI-polished text, ready to sign and submit.
        </Text>
        <SquishyPressable onPress={onUpgrade}>
          <View className="bg-teal rounded-xl px-4 py-2.5 mt-3 self-start">
            <Text className="font-jakarta-semibold text-sm text-white">
              Upgrade to Premium
            </Text>
          </View>
        </SquishyPressable>
      </View>
    </View>
  );
}
