import { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFile, faPlus, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { Media } from '@/types';
import { uploadEvidence, deleteEvidence } from '@/api';
import { toast } from '@/lib/toast';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type EvidenceCardProps = {
  ticketId: string;
  evidence: Media[];
  onImagePress?: (imageUrl: string) => void;
  onRefetch: () => void;
};

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);

export default function EvidenceCard({
  ticketId,
  evidence,
  onImagePress,
  onRefetch,
}: EvidenceCardProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const base64WithPrefix = `data:${mimeType};base64,${asset.base64}`;

    setUploading(true);
    try {
      await uploadEvidence(
        ticketId,
        base64WithPrefix,
        'User uploaded evidence',
        'PHOTO',
      );
      onRefetch();
      toast.success('Evidence Uploaded', 'Your evidence has been added');
    } catch {
      toast.error('Upload Failed', 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (mediaId: string) => {
    Alert.alert(
      'Delete Evidence',
      'Are you sure you want to remove this evidence?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(mediaId);
            try {
              await deleteEvidence(ticketId, mediaId);
              onRefetch();
              toast.success('Evidence Deleted', 'Evidence has been removed');
            } catch {
              toast.error('Delete Failed', 'Please try again');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-jakarta-semibold text-lg text-dark">
          Evidence & Documents
        </Text>
        <SquishyPressable
          onPress={handlePickImage}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Add evidence"
        >
          <View className="flex-row items-center rounded-lg bg-light px-3 py-2">
            {uploading ? (
              <ActivityIndicator size="small" color="#1abc9c" />
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} size={12} color="#1abc9c" style={{ marginRight: 4 }} />
                <Text className="font-jakarta-medium text-xs text-teal">Add</Text>
              </>
            )}
          </View>
        </SquishyPressable>
      </View>

      {evidence.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {evidence.map((item) => (
            <View key={item.id} style={{ width: '31%', aspectRatio: 1 }}>
              <SquishyPressable
                onPress={() => onImagePress?.(item.url)}
                style={{ flex: 1 }}
              >
                {isImageUrl(item.url) ? (
                  <Image
                    source={{ uri: item.url }}
                    style={{ flex: 1, borderRadius: 8 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 rounded-lg bg-light items-center justify-center">
                    <FontAwesomeIcon icon={faFile} size={24} color="#D1D5DB" />
                  </View>
                )}
              </SquishyPressable>
              {/* Delete button overlay */}
              <SquishyPressable
                onPress={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                accessibilityRole="button"
                accessibilityLabel="Delete evidence"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                }}
              >
                <View
                  className="rounded-full items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} size={10} color="#ffffff" />
                  )}
                </View>
              </SquishyPressable>
            </View>
          ))}
        </View>
      ) : (
        <SquishyPressable onPress={handlePickImage} disabled={uploading}>
          <View className="rounded-xl border-2 border-dashed border-border py-6 items-center">
            {uploading ? (
              <ActivityIndicator size="small" color="#1abc9c" />
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} size={28} color="#D1D5DB" />
                <Text className="font-jakarta text-sm text-gray mt-2">
                  Tap to add evidence
                </Text>
              </>
            )}
          </View>
        </SquishyPressable>
      )}
    </View>
  );
}
