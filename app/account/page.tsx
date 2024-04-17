import PageWrap from '@/components/PageWrap/PageWrap';
import { getCurrentUser } from '../actions';

const AccountPage = async () => {
  const user = await getCurrentUser();

  return (
    <PageWrap className="gap-y-16">
      <h1 className="font-sans text-4xl font-bold text-center">Account</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </PageWrap>
  );
};

export default AccountPage;
