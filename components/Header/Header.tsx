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
import { faSquareParking } from '@fortawesome/pro-solid-svg-icons';
import {
  faUpload,
  faUser,
  faCreditCard,
  faChartLine,
  faTicket,
  faCar,
} from '@fortawesome/pro-regular-svg-icons';
import { getCurrentUser } from '@/app/actions/user';
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
        <Link href="/" className="flex items-center gap-x-2">
          <FontAwesomeIcon icon={faSquareParking} size="2x" color="#266696" />
          <span className="font-bold font-display text-xl">
            Parking Ticket Pal
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  <FontAwesomeIcon icon={faChartLine} className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/tickets"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  <FontAwesomeIcon icon={faTicket} className="h-4 w-4" />
                  <span>Tickets</span>
                </Link>
                <Link
                  href="/vehicles"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  <FontAwesomeIcon icon={faCar} className="h-4 w-4" />
                  <span>Vehicles</span>
                </Link>
              </nav>
              <Link href="/new">
                <Button variant="outline" className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                  <span>Add Document</span>
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
