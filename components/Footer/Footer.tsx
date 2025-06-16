import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareParking } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';
import { SOCIAL_LINKS } from '@/constants';

type FooterProps = {
  className?: string;
};

const Footer = ({ className }: FooterProps) => (
  <footer
    className={cn('bg-[#2f2f2f] text-white pt-12 pb-6 px-4 mt-auto', className)}
  >
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 md:gap-0">
      <div className="flex-1 min-w-[220px] flex flex-col gap-8">
        <div className="mb-4">
          <Link href="/" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSquareParking} size="2x" color="#FFFFFF" />
            <span className="font-display font-bold text-2xl">
              Parking Ticket Pal
            </span>
          </Link>
        </div>
        <div>
          <h3 className="font-slab font-bold text-lg mb-2">About</h3>
          <p className="text-gray-300 text-base max-w-xs">
            Your all-in-one solution for handling Parking Charge Notices and
            Penalty Charge Notices <br />
            <span className="font-bold text-white">Track. Challenge. Win.</span>
          </p>
        </div>
        <div className="mt-6">
          <h3 className="font-slab font-bold text-lg mb-2">Connect</h3>
          <ul className="flex gap-6 mt-2">
            {SOCIAL_LINKS.map(({ id, label, href, icon }) => (
              <li key={id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                  aria-label={`${label} link`}
                >
                  <FontAwesomeIcon
                    icon={icon}
                    size="2x"
                    className="fill-gray-400 group-hover:text-[#266696] group-hover:transition-colors group-hover:duration-300 group-hover:fill-[#266696] group-hover:ease-in-out"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex-1 min-w-[220px] flex flex-col gap-8 justify-center md:items-end">
        <div>
          <h3 className="font-slab font-bold text-lg mb-2">Support</h3>
          <a
            href="mailto:support@parkticketpal.com"
            className="text-gray-300 text-base hover:text-white transition-colors"
          >
            support@parkticketpal.com
          </a>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 pt-6 text-gray-400 text-sm gap-2">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <span>
          &copy; {new Date().getFullYear()} Parking Ticket Pal. All rights
          reserved.
        </span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
      <span>
        Made with <span className="text-red-500 font-bold text-lg">♡</span> in{' '}
        <span className="text-white font-bold">South London</span>
      </span>
    </div>
  </footer>
);

export default Footer;
