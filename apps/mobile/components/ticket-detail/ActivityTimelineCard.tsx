import { useState } from 'react';
import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type TimelineEventType =
  | 'upload'
  | 'letter'
  | 'submit'
  | 'response'
  | 'deadline'
  | 'payment'
  | 'form'
  | 'challenge';

export type TimelineEvent = {
  type: TimelineEventType;
  date: Date;
  title: string;
  description?: string;
};

type ActivityTimelineCardProps = {
  events: TimelineEvent[];
};

const typeColors: Record<TimelineEventType, { dot: string; bg: string }> = {
  upload: { dot: '#1abc9c', bg: '#E6F7F4' },
  letter: { dot: '#1abc9c', bg: '#E6F7F4' },
  submit: { dot: '#00A699', bg: '#E6FFF9' },
  response: { dot: '#1abc9c', bg: '#E6F7F4' },
  deadline: { dot: '#FFB400', bg: '#FFF8E1' },
  payment: { dot: '#717171', bg: '#F7F7F7' },
  form: { dot: '#1abc9c', bg: '#E6F7F4' },
  challenge: { dot: '#00A699', bg: '#E6FFF9' },
};

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function ActivityTimelineCard({ events }: ActivityTimelineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <SquishyPressable onPress={() => setIsExpanded(!isExpanded)}>
        <View className="flex-row items-center justify-between">
          <Text className="font-jakarta-semibold text-lg text-dark">
            Activity Timeline
          </Text>
          <FontAwesomeIcon
            icon={faChevronDown}
            size={14}
            color="#717171"
            style={{
              transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
            }}
          />
        </View>
      </SquishyPressable>

      {isExpanded && (
        <View className="mt-4">
          {events.length === 0 ? (
            <Text className="font-jakarta text-sm text-gray">No activity yet</Text>
          ) : (
            <View style={{ paddingLeft: 24 }}>
              {/* Timeline line */}
              <View
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  backgroundColor: '#E2E8F0',
                }}
              />

              {events.map((event, index) => {
                const colors = typeColors[event.type];
                return (
                  <View key={`${event.type}-${index}`} className="mb-4" style={{ position: 'relative' }}>
                    {/* Dot */}
                    <View
                      style={{
                        position: 'absolute',
                        left: -24,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: colors.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.dot,
                        }}
                      />
                    </View>

                    <Text className="font-jakarta text-xs text-gray">
                      {formatDate(event.date)} at {formatTime(event.date)}
                    </Text>
                    <Text className="font-jakarta-medium text-sm text-dark mt-0.5">
                      {event.title}
                    </Text>
                    {event.description && (
                      <Text className="font-jakarta text-sm text-gray mt-0.5">
                        {event.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
