import { useState, useCallback } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Gallery, { type RenderItemInfo } from 'react-native-awesome-gallery';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export default function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const renderItem = useCallback(
    ({ item, setImageDimensions }: RenderItemInfo<string>) => (
      <Image
        source={{ uri: item }}
        style={{ flex: 1 }}
        contentFit="contain"
        onLoad={(e) => {
          const { width, height } = e.source;
          setImageDimensions({ width, height });
        }}
      />
    ),
    [],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
      }}
    >
      <StatusBar barStyle="light-content" />
      <Gallery
        data={images}
        initialIndex={initialIndex}
        onIndexChange={setCurrentIndex}
        onSwipeToClose={onClose}
        renderItem={renderItem}
        doubleTapScale={2.5}
        maxScale={5}
      />

      {/* Close button */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: 16,
          zIndex: 10,
        }}
      >
        <SquishyPressable onPress={onClose} accessibilityLabel="Close">
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={faXmark} size={18} color="#ffffff" />
          </View>
        </SquishyPressable>
      </View>

      {/* Image counter */}
      {images.length > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
