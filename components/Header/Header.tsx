import Link from 'next/link';
import { SubscriptionType } from '@prisma/client';
import { faCoinVertical } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';
import { getCurrentUser, getSubscription } from '@/app/actions';
import AuthButton from '../buttons/AuthButton/AuthButton';
import NavigationItems from '../NavigationItems/NavigationItems';
import { Badge } from '../ui/badge';

type HeaderProps = {
  className?: string;
};

// TODO: display credits in header and/or label for pro subscription

const Header = async ({ className }: HeaderProps) => {
  const subscription = await getSubscription();
  const user = await getCurrentUser();

  const credits = user?.credits || 0;

  return (
    <header
      className={cn('flex items-center justify-between p-4', {
        [className as string]: !!className,
      })}
    >
      <Link href="/" className="font-sans font-bold text-3xl">
        PCNs
      </Link>
      <nav className="flex items-center gap-x-4 md:gap-x-16">
        <section className="flex items-center gap-x-4">
          <div className="flex flex-col gap-y-1 items-center font-sans text-sm font-semibold">
            <div className="hidden md:block">
              <FontAwesomeIcon
                icon={faCoinVertical}
                className="text-gray-600"
                size="xl"
              />
            </div>
            <div className="flex gap-x-2 items-center">
              <span className="text-xl">{credits}</span>
              <span className="text-gray-500">
                credit{credits === 0 || credits > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {subscription?.type === SubscriptionType.PRO ? (
            <Badge
              className="font-sans bg-green-500 text-white hover:bg-green-500"
              variant="secondary"
            >
              Pro
            </Badge>
          ) : null}
        </section>
        <NavigationItems />
        <AuthButton />
      </nav>
    </header>
  );
};

export default Header;
