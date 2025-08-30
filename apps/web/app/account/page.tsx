import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import UserAccountForm from '@/components/forms/UserAccountForm/UserAccountForm';
import { getCurrentUser } from '@/utils/user';

const AccountPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-slab font-bold text-3xl">Account Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-medium text-2xl">
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal details and address information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAccountForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
