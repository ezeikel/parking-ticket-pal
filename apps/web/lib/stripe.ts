import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/constants';

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: STRIPE_API_VERSION,
});

export default stripe;
