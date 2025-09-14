import { SafeAreaView, View, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { GoogleSigninButton, } from '@react-native-google-signin/google-signin';
import { useAuthContext } from '@/contexts/auth';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const AuthScreen = () => {
  const { signIn } = useAuthContext();

  return (
    <SafeAreaView className="flex-1 items-center">
      <View 
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
        }}
      >
        <GoogleSigninButton size={GoogleSigninButton.Size.Standard} color={GoogleSigninButton.Color.Light} onPress={async () => {
          await signIn();
          router.replace('/')
        }} />
      </View>
    </SafeAreaView >
  )
}

export default AuthScreen;