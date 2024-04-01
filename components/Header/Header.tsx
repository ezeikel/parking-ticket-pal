import Link from 'next/link';
import cn from '@/utils/cn';
import { NAVIGATION_ITEMS } from '@/constants';
import AuthButton from '../buttons/AuthButton/AuthButton';

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => (
  <header
    className={cn('flex items-center justify-between p-4', {
      [className as string]: !!className,
    })}
  >
    <Link href="/" className="font-sans font-bold text-3xl">
      PCNs AI
    </Link>
    <nav className="flex items-center gap-x-4">
      {NAVIGATION_ITEMS.map((item) => (
        <Link key={item.id} href={item.href}>
          {item.component}
        </Link>
      ))}
      <AuthButton />
    </nav>
  </header>
);

export default Header;
