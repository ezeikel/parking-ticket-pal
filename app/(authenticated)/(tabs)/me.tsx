import { SafeAreaView, Text, View, Dimensions, Button } from 'react-native';
import tw from "twrnc";
import { useAuthContext } from '@/contexts/auth';
import useUser from '@/hooks/api/useUser';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const MeScreen = () => {
  const { data: { user } = {}, isLoading } = useUser();
  const { signOut } = useAuthContext();

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text style={tw`font-bold text-3xl mb-4`}>Me Screen</Text>
        <Text>{user.name}</Text>
        <Text>{user.email}</Text>
        <Button title="Sign Out" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

export default MeScreen;
