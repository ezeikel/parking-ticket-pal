import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/utils/user';
import { AccountSettingsPage } from '@/components/account';
import AdBannerServer from '@/components/AdBanner/AdBannerServer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';

type Tab = 'profile' | 'notifications' | 'billing' | 'security' | 'delete';

const VALID_TABS: Tab[] = [
  'profile',
  'notifications',
  'billing',
  'security',
  'delete',
];

type AccountPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const AccountPageFallback = () => (
  <div className="min-h-screen bg-light flex items-center justify-center">
    <FontAwesomeIcon
      icon={faSpinnerThird}
      className="h-8 w-8 animate-spin text-teal"
    />
  </div>
);

const AccountPage = async ({ searchParams }: AccountPageProps) => {
  const user = await getCurrentUser();
  const { tab } = await searchParams;

  if (!user) {
    redirect('/signin?redirect=/account');
  }

  // Validate the tab parameter
  const initialTab: Tab =
    tab && VALID_TABS.includes(tab as Tab) ? (tab as Tab) : 'profile';

  return (
    <>
      <Suspense fallback={<AccountPageFallback />}>
        <AccountSettingsPage user={user} initialTab={initialTab} />
      </Suspense>
      <Suspense fallback={null}>
        <AdBannerServer
          placement="account"
          className="mx-auto max-w-4xl px-4 pb-8"
        />
      </Suspense>
    </>
  );
};

export default AccountPage;
