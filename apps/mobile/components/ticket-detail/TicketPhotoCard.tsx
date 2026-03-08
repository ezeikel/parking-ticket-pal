import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Media } from '@/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type TicketPhotoCardProps = {
  media: Media[];
  onImagePress?: (imageUrl: string) => void;
};

export default function TicketPhotoCard({ media, onImagePress }: TicketPhotoCardProps) {
  if (media.length === 0) return null;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-3">
        Ticket Photo
      </Text>
      {media.map((image) => (
        <SquishyPressable
          key={image.id}
          onPress={() => onImagePress?.(image.url)}
        >
          <View className="rounded-xl overflow-hidden mb-2">
            <Image
              source={{ uri: image.url }}
              style={{ width: '100%', aspectRatio: 4 / 3 }}
              contentFit="cover"
            />
          </View>
        </SquishyPressable>
      ))}
    </View>
  );
}
