import { SafeAreaView, View, Dimensions } from 'react-native';
import tw from "twrnc";
import { GoogleSigninButton, } from '@react-native-google-signin/google-signin';
import { useAuthContext } from '@/contexts/auth';
import { router } from 'expo-router';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const AuthScreen = () => {
  const { signIn, isLoading, isAuthenticated } = useAuthContext();

  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <GoogleSigninButton size={GoogleSigninButton.Size.Standard} color={GoogleSigninButton.Color.Light} onPress={async () => {
          await signIn();
          router.replace('/')
        }} />
      </View>
    </SafeAreaView >
  )
}

export default AuthScreen;