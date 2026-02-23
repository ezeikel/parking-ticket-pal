import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

type UIContextArgs = {
  headerHeight: number;
  setHeaderHeight: Dispatch<SetStateAction<number>>;
};

type UIContextProviderProps = {
  children: React.ReactNode;
};

export const UIContext = createContext<UIContextArgs>({
  headerHeight: 0,
  setHeaderHeight: () => {},
});

export const UIContextProvider = ({ children }: UIContextProviderProps) => {
  const [headerHeight, setHeaderHeight] = useState(88);

  const value = useMemo(
    () => ({
      headerHeight,
      setHeaderHeight,
    }),
    [headerHeight],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIContextProvider');
  }

  return context;
};
