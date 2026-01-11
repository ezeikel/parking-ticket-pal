import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { User as PrismaUser } from '@parking-ticket-pal/db/types';

type SessionUser = {
  dbId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
};

const useUser = () => {
  const { data: session } = useSession();
  const [user, setUser] = useState<PrismaUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const sessionUser = session?.user as SessionUser;
      if (!sessionUser?.dbId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/user/${sessionUser.dbId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');

        const userData = await response.json();
        setUser(userData.user);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('An unknown error occurred'),
        );
        console.error('Error fetching user:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [session?.user]);

  return { user, isLoading, error };
};

export default useUser;
