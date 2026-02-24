'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  // faXTwitter,
  faInstagram,
  faTiktok,
  faLinkedinIn,
  faWhatsapp,
  faApple,
  faGooglePlay,
} from '@fortawesome/free-brands-svg-icons';
import cn from '@/utils/cn';

type FooterProps = {
  className?: string;
};

type FooterLink = {
  label: string;
  href: string;
};

const productLinks: FooterLink[] = [
  { label: 'Upload Ticket', href: '/new' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Dashboard', href: '/dashboard' },
];

const resourceLinks: FooterLink[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Appeal Guides', href: '/guides' },
  { label: 'Free Tools', href: '/tools' },
  { label: 'Letter Templates', href: '/tools/letters' },
  {
    label: 'Contravention Codes',
    href: '/tools/reference/contravention-codes',
  },
  { label: 'Issuer Directory', href: '/tools/reference/issuers' },
  { label: 'Compare', href: '/compare' },
];

const companyLinks: FooterLink[] = [
  { label: 'Contact', href: 'mailto:support@parkticketpal.com' },
];

type SocialLink = {
  icon: typeof faInstagram;
  href: string;
  label: string;
};

const socialLinks: SocialLink[] = [
  // {
  //   icon: faXTwitter,
  //   href: 'https://twitter.com/parkticketpal',
  //   label: 'Twitter',
  // },
  {
    icon: faInstagram,
    href: 'https://www.instagram.com/parkingticketpal',
    label: 'Instagram',
  },
  {
    icon: faTiktok,
    href: 'https://www.tiktok.com/@parkingticketpal',
    label: 'TikTok',
  },
  {
    icon: faWhatsapp,
    href: 'https://wa.me/447932442879',
    label: 'WhatsApp',
  },
  {
    icon: faLinkedinIn,
    href: 'https://www.linkedin.com/company/108306925',
    label: 'LinkedIn',
  },
];

const Footer = ({ className }: FooterProps) => (
  <footer className={cn('bg-footer py-16 mt-auto', className)}>
    <div className="mx-auto max-w-[1280px] px-6">
      {/* Main Footer Content */}
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand Column */}
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/ptp.svg"
              alt="Parking Ticket Pal"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="font-display font-bold text-lg text-white">
              Parking Ticket Pal
            </span>
          </Link>
          <p className="mt-4 text-sm text-white/60">
            Fight unfair parking tickets with AI. Track, challenge, and win.
          </p>

          {/* App Store Badges */}
          <div className="mt-6 flex flex-col gap-2">
            <a
              href="#"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <div className="flex h-10 w-32 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3">
                <FontAwesomeIcon
                  icon={faApple}
                  className="text-lg text-white"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[8px] leading-tight text-white/60">
                    Download on the
                  </span>
                  <span className="text-xs font-semibold leading-tight text-white">
                    App Store
                  </span>
                </div>
              </div>
            </a>
            <a
              href="#"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <div className="flex h-10 w-32 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3">
                <FontAwesomeIcon
                  icon={faGooglePlay}
                  className="text-sm text-white"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[8px] leading-tight text-white/60">
                    GET IT ON
                  </span>
                  <span className="text-xs font-semibold leading-tight text-white">
                    Google Play
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="text-sm font-semibold text-white">Product</h4>
          <ul className="mt-4 space-y-3">
            {productLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources Column */}
        <div>
          <h4 className="text-sm font-semibold text-white">Resources</h4>
          <ul className="mt-4 space-y-3">
            {resourceLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-4 space-y-3">
            {companyLinks.map((link) => (
              <li key={link.label}>
                {link.href.startsWith('mailto:') ? (
                  <a
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-12 h-px bg-white/10" />

      {/* Bottom Footer */}
      <div className="mt-8 flex flex-col items-center justify-between gap-6 md:flex-row">
        {/* Social Links */}
        <div className="flex items-center gap-6">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-colors duration-300 hover:text-teal"
              aria-label={social.label}
            >
              <FontAwesomeIcon icon={social.icon} className="text-2xl" />
            </a>
          ))}
        </div>

        {/* Made in text */}
        <p className="text-sm text-white/40">
          Made with <span className="text-red-500 font-bold text-lg">♡</span> in{' '}
          <span className="text-white font-bold">South London</span>
        </p>

        {/* Legal Links */}
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>© {new Date().getFullYear()} Parking Ticket Pal</span>
          <span className="hidden md:inline">·</span>
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <span className="hidden md:inline">·</span>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
