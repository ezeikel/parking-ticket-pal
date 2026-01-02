import { getCurrentUser } from '@/utils/user';
import Header from './Header';

const HeaderWrapper = async () => {
  const user = await getCurrentUser();

  return <Header user={user} />;
};

export default HeaderWrapper;
