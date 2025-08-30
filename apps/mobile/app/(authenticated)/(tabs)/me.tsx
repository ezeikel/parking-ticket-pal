import { useEffect } from 'react';
import { SafeAreaView, Text, View, ScrollView, Button, TextInput } from 'react-native';
import tw from "twrnc";
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '@/contexts/auth';
import useUser from '@/hooks/api/useUser';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

const MeScreen = () => {
  const { data, isLoading, refetch } = useUser();
  const user = data?.user;
  const { signOut } = useAuthContext();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // TODO: call to API endpoint
      await refetch(); // refresh user data
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    reset({
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
    });
  }, [user]);

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center`}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1`}>
      <ScrollView style={tw`flex-1 px-4`}>
        <View style={tw`flex-row justify-between items-center mb-6`}>
          <Text style={tw`font-bold text-3xl`}>Profile Settings</Text>
          <Button
            title="Sign Out"
            onPress={signOut}
            color="red"
          />
        </View>

        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-600 mb-1`}>Email</Text>
          <Text style={tw`text-gray-800`}>{user?.email}</Text>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-600 mb-1`}>Name</Text>
              <TextInput
                style={tw`border rounded p-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                onChangeText={onChange}
                value={value}
                autoCapitalize="words"
              />
              {errors.name && (
                <Text style={tw`text-red-500 text-sm mt-1`}>{errors.name.message}</Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field: { onChange, value } }) => (
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-600 mb-1`}>Phone Number</Text>
              <TextInput
                style={tw`border rounded p-2 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                placeholder="+44XXXXXXXXXX"
              />
              {errors.phoneNumber && (
                <Text style={tw`text-red-500 text-sm mt-1`}>{errors.phoneNumber.message}</Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, value } }) => (
            <View style={tw`mb-6`}>
              <Text style={tw`text-gray-600 mb-1`}>Address</Text>
              <TextInput
                style={tw`border rounded p-2 min-h-[100px] ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                placeholder="Enter your full address"
                textAlignVertical="top"
              />
              {errors.address && (
                <Text style={tw`text-red-500 text-sm mt-1`}>{errors.address.message}</Text>
              )}
            </View>
          )}
        />

        <View style={tw`mb-6`}>
          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            color="#0284c7"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MeScreen;
