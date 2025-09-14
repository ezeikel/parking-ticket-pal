import { SafeAreaView, Text, View, Dimensions } from 'react-native';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const PaymentsScreen = () => {
  return (
    <SafeAreaView className="flex-1 items-center">
      <View
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
        }}
      >
        <Text className="font-uknumberplate font-bold text-3xl mb-4">PAYMENTS SCREEN</Text>
      </View>
    </SafeAreaView>
  );
}

export default PaymentsScreen;
