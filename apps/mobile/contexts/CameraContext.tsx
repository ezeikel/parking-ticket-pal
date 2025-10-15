import React, { createContext, useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useLogger } from '@/lib/logger';

type CameraPermissionStatus = 'undetermined' | 'granted' | 'denied';

interface CameraContextType {
  cameraPermission: CameraPermissionStatus;
  mediaLibraryPermission: CameraPermissionStatus;
  requestCameraPermission: () => Promise<boolean>;
  requestMediaLibraryPermission: () => Promise<boolean>;
  arePermissionsReady: boolean;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const useCameraContext = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return context;
};

interface CameraProviderProps {
  children: React.ReactNode;
}

export const CameraProvider = ({ children }: CameraProviderProps) => {
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>('undetermined');
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<CameraPermissionStatus>('undetermined');
  const logger = useLogger();

  // Check permissions on app load
  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      logger.debug('Checking initial camera permissions', { context: 'camera_provider' });

      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      setCameraPermission(cameraStatus.granted ? 'granted' : 'denied');
      setMediaLibraryPermission(mediaStatus.granted ? 'granted' : 'denied');

      logger.debug('Initial permissions checked', {
        context: 'camera_provider',
        camera_granted: cameraStatus.granted,
        media_library_granted: mediaStatus.granted
      });
    } catch (error) {
      logger.error('Failed to check initial permissions', { context: 'camera_provider' }, error as Error);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      logger.debug('Requesting camera permission', { context: 'camera_provider' });

      const result = await ImagePicker.requestCameraPermissionsAsync();
      const granted = result.granted;

      setCameraPermission(granted ? 'granted' : 'denied');

      logger.debug('Camera permission result', {
        context: 'camera_provider',
        granted,
        can_ask_again: result.canAskAgain
      });

      return granted;
    } catch (error) {
      logger.error('Failed to request camera permission', { context: 'camera_provider' }, error as Error);
      setCameraPermission('denied');
      return false;
    }
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    try {
      logger.debug('Requesting media library permission', { context: 'camera_provider' });

      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = result.granted;

      setMediaLibraryPermission(granted ? 'granted' : 'denied');

      logger.debug('Media library permission result', {
        context: 'camera_provider',
        granted,
        can_ask_again: result.canAskAgain
      });

      return granted;
    } catch (error) {
      logger.error('Failed to request media library permission', { context: 'camera_provider' }, error as Error);
      setMediaLibraryPermission('denied');
      return false;
    }
  };

  const arePermissionsReady = cameraPermission !== 'undetermined' && mediaLibraryPermission !== 'undetermined';

  const value: CameraContextType = {
    cameraPermission,
    mediaLibraryPermission,
    requestCameraPermission,
    requestMediaLibraryPermission,
    arePermissionsReady,
  };

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  );
};