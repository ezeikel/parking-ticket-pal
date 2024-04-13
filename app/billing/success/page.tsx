import PageWrap from '@/components/PageWrap/PageWrap';

const SubscriptionSuccessPage = () => (
  <PageWrap>
    <div className="flex flex-col items-center">
      <h1 className="text-3xl text-center mb-5 md:text-7xl md:mb-12">
        Subscription setup <span>complete</span>
      </h1>
      <div className="flex flex-col gap-y-2 max-w-md mb-12 md:mb-16">
        <p className="text-lg text-center">
          Thanks for believing in PCNs and starting your subscription. This
          means a lot to the team.
        </p>
        <p className="text-lg text-center">
          You will receive an email receipt for this payment. If you have any
          questions please contact us at &nbsp;
          <a className="text-blue" href="mailto:support@pcns.ai">
            support@pcns.ai
          </a>
        </p>
      </div>
    </div>
  </PageWrap>
);

export default SubscriptionSuccessPage;
