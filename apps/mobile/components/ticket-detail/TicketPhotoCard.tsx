import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Media } from '@/types';

type TicketPhotoCardProps = {
  media: Media[];
};

export default function TicketPhotoCard({ media }: TicketPhotoCardProps) {
  if (media.length === 0) return null;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-3">
        Ticket Photo
      </Text>
      {media.map((image) => (
        <View key={image.id} className="rounded-xl overflow-hidden mb-2">
          <Image
            source={{ uri: image.url }}
            style={{ width: '100%', aspectRatio: 4 / 3 }}
            contentFit="cover"
          />
        </View>
      ))}
    </View>
  );
}
