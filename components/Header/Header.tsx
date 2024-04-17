import Link from 'next/link';
import cn from '@/utils/cn';
import AuthButton from '../buttons/AuthButton/AuthButton';
import NavigationItems from '../NavigationItems/NavigationItems';

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
      PCNs
    </Link>
    <nav className="flex items-center gap-x-16">
      <NavigationItems />
      <AuthButton />
    </nav>
  </header>
);

export default Header;
