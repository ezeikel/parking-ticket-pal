import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const getCurrentUser = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const getTickets = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/tickets`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const signIn = async () => {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  
  const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/mobile`, {
    idToken: userInfo.idToken
  });

  return response.data;
}