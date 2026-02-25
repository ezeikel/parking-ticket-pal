import { getCurrentUser } from '@/utils/user';
import { isAdFree } from '@/lib/subscription';
import AdBanner from './AdBanner';

type Placement =
  | 'ticket-detail'
  | 'tickets-list'
  | 'dashboard'
  | 'account'
  | 'blog'
  | 'tools';

const SLOT_IDS: Record<Placement, string> = {
  'ticket-detail': process.env.NEXT_PUBLIC_ADSENSE_SLOT_TICKET_DETAIL ?? '',
  'tickets-list': process.env.NEXT_PUBLIC_ADSENSE_SLOT_TICKETS_LIST ?? '',
  dashboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD ?? '',
  account: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ACCOUNT ?? '',
  blog: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG ?? '',
  tools: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOLS ?? '',
};

// Public placements don't require auth — ads always show
const PUBLIC_PLACEMENTS: Placement[] = ['blog', 'tools'];

type AdBannerServerProps = {
  placement: Placement;
  className?: string;
};

const AdBannerServer = async ({
  placement,
  className,
}: AdBannerServerProps) => {
  // For authenticated placements, check ad-free status
  if (!PUBLIC_PLACEMENTS.includes(placement)) {
    const user = await getCurrentUser();

    // Premium purchasers get 30 days ad-free
    if (user && isAdFree(user)) {
      return null;
    }
  }

  const slot = SLOT_IDS[placement];
  if (!slot) {
    return null;
  }

  return <AdBanner slot={slot} className={className} />;
};

export default AdBannerServer;
