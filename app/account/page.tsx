import PageWrap from '@/components/PageWrap/PageWrap';
import { getCurrentUser } from '../actions';

const AccountPage = async () => {
  const user = await getCurrentUser();

  return (
    <PageWrap>
      <h1>Account Page</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </PageWrap>
  );
};

export default AccountPage;
