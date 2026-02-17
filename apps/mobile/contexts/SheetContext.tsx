import React, { createContext, useContext, useState, useCallback } from 'react';
import { useCameraContext } from '@/contexts/CameraContext';

interface SheetContextType {
  cameraVisible: boolean;
  manualEntryVisible: boolean;
  openCamera: () => void;
  closeCamera: () => void;
  openManualEntry: () => void;
  closeManualEntry: () => void;
}

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export function useSheetContext() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheetContext must be used within a SheetProvider');
  }
  return context;
}

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const { arePermissionsReady, requestCameraPermission } = useCameraContext();

  const openCamera = useCallback(() => {
    if (!arePermissionsReady) {
      requestCameraPermission();
    }
    setCameraVisible(true);
  }, [arePermissionsReady, requestCameraPermission]);

  const closeCamera = useCallback(() => setCameraVisible(false), []);
  const openManualEntry = useCallback(() => setManualEntryVisible(true), []);
  const closeManualEntry = useCallback(() => setManualEntryVisible(false), []);

  return (
    <SheetContext.Provider
      value={{
        cameraVisible,
        manualEntryVisible,
        openCamera,
        closeCamera,
        openManualEntry,
        closeManualEntry,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}
