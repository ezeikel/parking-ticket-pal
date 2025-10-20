import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@parking_ticket_pal_onboarding_completed';

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

export const resetOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};
