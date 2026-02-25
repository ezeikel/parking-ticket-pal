import { redirect } from 'next/navigation';
import { db } from '@parking-ticket-pal/db';
import ReferralLandingClient from './ReferralLandingClient';

type Props = {
  params: Promise<{ code: string }>;
};

const ReferralLandingPage = async ({ params }: Props) => {
  const { code } = await params;

  const referralCode = await db.referralCode.findUnique({
    where: { code },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!referralCode) {
    redirect('/?invalid_referral=true');
  }

  const referrerName = referralCode.user.name?.split(' ')[0] || 'A friend';

  return <ReferralLandingClient code={code} referrerName={referrerName} />;
};

export default ReferralLandingPage;
