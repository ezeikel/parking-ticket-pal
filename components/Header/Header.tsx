import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  faParking,
  faUpload,
  faUser,
  faCreditCard,
} from '@fortawesome/pro-regular-svg-icons';
import { getCurrentUser } from '@/app/actions';
import cn from '@/utils/cn';
import SignInButton from '../buttons/SignInButton/SignInButton';
import SignOutButton from '../buttons/SignOutButton/SignOutButton';

type HeaderProps = {
  className?: string;
};

const Header = async ({ className }: HeaderProps) => {
  const user = await getCurrentUser();
  const userInitials = user?.name
    ?.split(' ')
    .map((name) => name[0])
    .join('');

  return (
    <header className={cn('border-b', className)}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faParking} className="h-6 w-6" />
          <span className="font-bold text-xl">Parking Ticket Pal</span>
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/upload">
                <Button variant="outline" className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                  <span>Upload Document</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <Link href="/account">
                    <DropdownMenuItem className="cursor-pointer">
                      <FontAwesomeIcon icon={faUser} className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/account/billing">
                    <DropdownMenuItem className="cursor-pointer">
                      <FontAwesomeIcon
                        icon={faCreditCard}
                        className="mr-2 h-4 w-4"
                      />
                      <span>Billing</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
