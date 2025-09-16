import { Typography } from '@/components/Typography/Typography';
import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <Typography
          font="uknumberplate"
          weight="bold"
          size="3xl"
          className="mb-4"
        >
          PAYMENTS SCREEN
        </Typography>
      </View>
    </SafeAreaView>
  );
}

export default PaymentsScreen;
