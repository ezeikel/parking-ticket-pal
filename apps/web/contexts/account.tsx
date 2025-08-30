import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
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

  return (
    <AccountContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        isFundAccountDialogOpen,
        setIsFundAccountDialogOpen,
      }}
    >
      {children}
    </AccountContext.Provider>
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
