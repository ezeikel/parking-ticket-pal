import { Plus_Jakarta_Sans, Roboto_Slab } from 'next/font/google';
import localFont from 'next/font/local';

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

export const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-slab',
});

export const ukNumberPlate = localFont({
  src: '../assets/fonts/UKNumberPlate.ttf',
  variable: '--font-uk-number-plate',
  display: 'swap',
});
