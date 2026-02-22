import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faPlus,
  faCloudArrowUp,
  faFile,
  faTrash,
} from '@fortawesome/pro-solid-svg-icons';
import { Media } from '@/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type EvidenceCardProps = {
  ticketId: string;
  evidence: Media[];
  onImagePress?: (imageUrl: string) => void;
};

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);

export default function EvidenceCard({
  ticketId: _ticketId,
  evidence,
  onImagePress,
}: EvidenceCardProps) {
  const [showUpload, setShowUpload] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // TODO: Upload evidence via API
      Alert.alert('Coming Soon', 'Evidence upload will be available soon.');
    }
  };

  const handleDelete = (item: Media) => {
    Alert.alert('Delete Evidence', 'Are you sure you want to delete this evidence?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // TODO: Delete evidence via API
          Alert.alert('Coming Soon', 'Evidence deletion will be available soon.');
        },
      },
    ]);
  };

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-jakarta-semibold text-lg text-dark">
          Evidence & Documents
        </Text>
        <SquishyPressable onPress={() => setShowUpload(true)}>
          <View className="flex-row items-center rounded-lg border border-border px-3 py-1.5">
            <FontAwesomeIcon icon={faPlus} size={12} color="#717171" style={{ marginRight: 6 }} />
            <Text className="font-jakarta-medium text-xs text-dark">Add Evidence</Text>
          </View>
        </SquishyPressable>
      </View>

      {/* Upload prompt */}
      {showUpload && evidence.length === 0 && (
        <SquishyPressable onPress={handlePickImage}>
          <View className="rounded-xl border-2 border-dashed border-border py-6 items-center mb-4">
            <FontAwesomeIcon icon={faCloudArrowUp} size={28} color="#D1D5DB" />
            <Text className="font-jakarta text-sm text-gray mt-2">
              Tap to upload evidence
            </Text>
          </View>
        </SquishyPressable>
      )}

      {/* Evidence grid */}
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
              <SquishyPressable
                onPress={() => handleDelete(item)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FF5A5F',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon icon={faTrash} size={10} color="#ffffff" />
              </SquishyPressable>
            </View>
          ))}

          {/* Add more button */}
          <SquishyPressable
            onPress={handlePickImage}
            style={{ width: '31%', aspectRatio: 1 }}
          >
            <View className="flex-1 rounded-lg border-2 border-dashed border-border items-center justify-center">
              <FontAwesomeIcon icon={faPlus} size={20} color="#717171" />
            </View>
          </SquishyPressable>
        </View>
      ) : !showUpload ? (
        <SquishyPressable onPress={() => setShowUpload(true)}>
          <View className="rounded-xl border-2 border-dashed border-border py-6 items-center">
            <FontAwesomeIcon icon={faCloudArrowUp} size={28} color="#D1D5DB" />
            <Text className="font-jakarta text-sm text-gray mt-2">
              Add supporting evidence
            </Text>
          </View>
        </SquishyPressable>
      ) : null}
    </View>
  );
}
