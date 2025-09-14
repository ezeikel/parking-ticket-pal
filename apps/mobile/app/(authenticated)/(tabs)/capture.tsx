import { View, Text } from "react-native";

export default function CaptureScreen() {
  // This screen is no longer used for camera functionality
  // Camera is now handled directly from the tab bar button
  return (
    <View className="flex-1 justify-center items-center">
      <Text>Camera functionality is handled via the tab button</Text>
    </View>
  );
}