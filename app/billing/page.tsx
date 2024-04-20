import { SubscriptionType } from '@prisma/client';
import PageWrap from '@/components/PageWrap/PageWrap';
import { CardTitle, CardHeader, CardContent, Card } from '@/components/ui/card';
import SubscribeButton from '@/components/buttons/SubscribeButton/SubscribeButton';
import ManageSubscriptionButton from '@/components/buttons/ManageSubscriptionButton/ManageSubscriptionButton';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
import { ProductType } from '@/types';
import { getSubscription } from '../actions';

type CardData = {
  title: string;
  price: number;
  per: string;
  buttonLabel: string;
  buttonVariant: 'default' | 'outline';
  disabled?: boolean;
  type: ProductType;
};

const CARD_DATA: CardData[] = [
  {
    title: 'Pay per ticket (credit)',
    price: 249,
    per: 'Per credit',
    buttonLabel: 'Selected',
    buttonVariant: 'outline',
    disabled: true,
    type: ProductType.PAY_PER_TICKET,
  },
  {
    title: 'Pro Monthly',
    price: 599,
    per: 'Per month',
    buttonLabel: 'Subscribe',
    buttonVariant: 'default',
    type: ProductType.PRO_MONTHLY,
  },
  {
    title: 'Pro Annual',
    price: 5999,
    per: 'Per year',
    buttonLabel: 'Subscribe',
    buttonVariant: 'default',
    type: ProductType.PRO_ANNUAL,
  },
];

const BillingPage = async () => {
  const subscription = await getSubscription();

  return (
    <PageWrap className="gap-y-16">
      <h1 className="font-sans text-4xl font-bold text-center">Billing</h1>
      <div className="flex items-center flex-1">
        {subscription?.type === SubscriptionType.PRO ? (
          <section className="h-full flex-1 flex flex-col items-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-gray-600 md:text-lg">
                Thank you for subscribing to Pro.
              </p>
              <ManageSubscriptionButton variant="outline" />
            </div>
          </section>
        ) : (
          <section className="h-full flex-1 grid items-center justify-center gap-6 lg:grid-cols-3 lg:gap-12">
            {CARD_DATA.map(
              ({
                title,
                price,
                per,
                buttonLabel,
                buttonVariant,
                disabled = false,
                type,
              }) => (
                <Card className={`shadow-lg ${disabled ? 'bg-gray-100' : ''}`}>
                  <CardHeader>
                    <CardTitle className="font-sans">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-3">
                    <h2 className="text-4xl font-bold">
                      {formatPenniesToPounds(price)}
                    </h2>
                    <p className="text-sm text-gray-500">{per}</p>
                    <SubscribeButton
                      className="w-full"
                      variant={buttonVariant}
                      text={buttonLabel}
                      disabled={disabled}
                      productType={type}
                    />
                  </CardContent>
                </Card>
              ),
            )}
          </section>
        )}
      </div>
    </PageWrap>
  );
};

export default BillingPage;
