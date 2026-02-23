import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

type AccountContextArgs = {
  isFundAccountDialogOpen: boolean;
  setIsFundAccountDialogOpen: Dispatch<SetStateAction<boolean>>;
};

type AccountContextProviderProps = {
  children: React.ReactNode;
};

export const AccountContext = createContext<AccountContextArgs>({
  isFundAccountDialogOpen: false,
  setIsFundAccountDialogOpen: () => {},
});

export const AccountContextProvider = ({
  children,
}: AccountContextProviderProps) => {
  const [isFundAccountDialogOpen, setIsFundAccountDialogOpen] = useState(false);

  const value = useMemo(
    () => ({
      isFundAccountDialogOpen,
      setIsFundAccountDialogOpen,
    }),
    [isFundAccountDialogOpen],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
};

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error(
      'useAccountContext must be used within a AccountContextProvider',
    );
  }

  return context;
};
