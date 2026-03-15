import { View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPen, faCamera } from '@fortawesome/pro-solid-svg-icons';
import { Media } from '@/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type TicketPhotoCardProps = {
  media: Media[];
  onImagePress?: (imageUrl: string) => void;
  onReplace?: () => void;
  onUpload?: () => void;
  isUploading?: boolean;
};

export default function TicketPhotoCard({
  media,
  onImagePress,
  onReplace,
  onUpload,
  isUploading = false,
}: TicketPhotoCardProps) {
  const hasImages = media.length > 0;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-jakarta-semibold text-lg text-dark">
          Ticket Photo
        </Text>
        {hasImages && onReplace && (
          <SquishyPressable onPress={onReplace} disabled={isUploading}>
            <View className="flex-row items-center gap-1.5">
              <FontAwesomeIcon icon={faPen} size={12} color="#717171" />
              <Text className="font-jakarta-medium text-sm text-gray">Replace</Text>
            </View>
          </SquishyPressable>
        )}
      </View>

      {hasImages ? (
        <>
          {media.map((image) => (
            <SquishyPressable
              key={image.id}
              onPress={() => onImagePress?.(image.url)}
              disabled={isUploading}
            >
              <View className="rounded-xl overflow-hidden mb-2 relative">
                <Image
                  source={{ uri: image.url }}
                  style={{ width: '100%', aspectRatio: 4 / 3 }}
                  contentFit="cover"
                />
                {isUploading && (
                  <View
                    className="absolute inset-0 items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                  >
                    <ActivityIndicator size="large" color="#1abc9c" />
                  </View>
                )}
              </View>
            </SquishyPressable>
          ))}
        </>
      ) : (
        <SquishyPressable onPress={onUpload} disabled={isUploading}>
          <View className="rounded-xl border-2 border-dashed border-border bg-light/50 py-10 items-center justify-center">
            <View className="items-center justify-center size-14 rounded-full bg-teal/10 mb-3">
              <FontAwesomeIcon icon={faCamera} size={20} color="#1abc9c" />
            </View>
            <Text className="font-jakarta-semibold text-dark">
              Add a photo of your ticket
            </Text>
            <Text className="font-jakarta text-sm text-gray mt-1">
              This helps us extract details and verify information
            </Text>
            {isUploading && (
              <ActivityIndicator size="small" color="#1abc9c" style={{ marginTop: 12 }} />
            )}
          </View>
        </SquishyPressable>
      )}
    </View>
  );
}
