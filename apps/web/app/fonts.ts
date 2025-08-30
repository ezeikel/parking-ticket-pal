import { Inter, Roboto_Slab, Lato } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-slab',
});

export const lato = Lato({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
  weight: ['700'],
});
