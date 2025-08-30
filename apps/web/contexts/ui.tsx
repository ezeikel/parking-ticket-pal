import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
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

  return (
    <UIContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        headerHeight,
        setHeaderHeight,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIContextProvider');
  }

  return context;
};
