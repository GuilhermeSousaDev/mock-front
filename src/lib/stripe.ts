import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Stripe.js must be loaded once per publishable key and reused across renders.
const cache = new Map<string, Promise<Stripe | null>>();

export function getStripe(publishableKey: string): Promise<Stripe | null> {
  let promise = cache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    cache.set(publishableKey, promise);
  }
  return promise;
}
