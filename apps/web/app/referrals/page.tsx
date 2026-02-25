import {
  getOrCreateReferralCode,
  getReferralStats,
} from '@/app/actions/referral';
import ReferralLinkCopy from './ReferralLinkCopy';

const ReferralsPage = async () => {
  const [codeResult, statsResult] = await Promise.all([
    getOrCreateReferralCode(),
    getReferralStats(),
  ]);

  const code = codeResult.data?.code;
  const stats = statsResult.data;
  const referralLink = code
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkingticketpal.com'}/r/${code}`
    : null;

  return (
    <div className="min-h-screen bg-light">
      <div className="mx-auto max-w-[800px] px-4 py-6 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark md:text-3xl">
            Invite Friends
          </h1>
          <p className="mt-1 text-gray">
            Share your referral link and earn credits for every friend who signs
            up.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-dark">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-semibold text-teal">
                1
              </div>
              <div>
                <p className="font-medium text-dark">Share your link</p>
                <p className="text-sm text-gray">
                  Send your unique referral link to friends
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-semibold text-teal">
                2
              </div>
              <div>
                <p className="font-medium text-dark">Friend signs up</p>
                <p className="text-sm text-gray">
                  They create a free account using your link
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-semibold text-teal">
                3
              </div>
              <div>
                <p className="font-medium text-dark">You both get credit</p>
                <p className="text-sm text-gray">
                  You get £5, they get £3 off their first challenge
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray">Total Referrals</p>
              <p className="mt-1 text-2xl font-bold text-dark">
                {stats.totalReferrals}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray">Successful</p>
              <p className="mt-1 text-2xl font-bold text-teal">
                {stats.creditedReferrals}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray">Credit Balance</p>
              <p className="mt-1 text-2xl font-bold text-dark">
                £{(stats.creditBalance / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray">Total Earned</p>
              <p className="mt-1 text-2xl font-bold text-dark">
                £{(stats.totalEarned / 100).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Referral Link */}
        {referralLink && code && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-dark">
              Your referral link
            </h2>
            <ReferralLinkCopy link={referralLink} code={code} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsPage;
