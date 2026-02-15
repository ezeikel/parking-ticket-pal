import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLightbulb } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps, TicketStage } from '../types';

const stages: { id: TicketStage; label: string; desc: string }[] = [
  {
    id: 'initial',
    label: 'Initial Ticket',
    desc: "Just received — on windscreen or in the post. I haven't appealed yet.",
  },
  {
    id: 'nto',
    label: 'Notice to Owner (NtO)',
    desc: 'I received a formal "Notice to Owner" letter asking for the full amount.',
  },
  {
    id: 'rejection',
    label: 'Rejection / Tribunal',
    desc: 'The Council rejected my formal representation and I want to go to the independent tribunal.',
  },
  {
    id: 'charge_cert',
    label: 'Charge Certificate / Bailiffs',
    desc: 'I received a Charge Certificate or Order for Recovery. It is urgent.',
  },
];

const StageStep = ({ onNext }: WizardStepProps) => {
  const handleSelect = (ticketStage: TicketStage) => {
    onNext({ ticketStage });
  };

  return (
    <View>
      <View className="gap-y-3">
        {stages.map((stage) => (
          <SquishyPressable
            key={stage.id}
            onPress={() => handleSelect(stage.id)}
            className="rounded-xl border-2 border-gray-200 p-4"
          >
            <Text className="font-jakarta-semibold text-base text-gray-900">{stage.label}</Text>
            <Text className="font-jakarta text-sm text-gray-500 mt-1">{stage.desc}</Text>
          </SquishyPressable>
        ))}
      </View>

      {/* Pro tip */}
      <View className="mt-4 rounded-lg p-3" style={{ backgroundColor: '#FFFBEB' }}>
        <View className="flex-row items-start gap-x-2">
          <FontAwesomeIcon icon={faLightbulb} size={14} color="#F59E0B" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text className="font-jakarta-semibold text-sm text-gray-900">
              Pro Tip: The 14-Day Rule
            </Text>
            <Text className="font-jakarta text-sm text-gray-600 mt-1">
              Most Councils will "freeze" the 50% discount if you appeal informally within the first
              14 days.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StageStep;
