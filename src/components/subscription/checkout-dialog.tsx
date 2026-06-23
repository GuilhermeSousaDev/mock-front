'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock } from 'lucide-react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe';
import { subscriptions as subscriptionsApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CheckoutSession, Subscription } from '@/types/api';

interface CheckoutDialogProps {
  session: CheckoutSession | null;
  onClose: () => void;
  onSuccess: (sub: Subscription) => void;
}

export function CheckoutDialog({ session, onClose, onSuccess }: CheckoutDialogProps) {
  const { t } = useTranslation();

  // Re-create the Stripe.js promise only when the publishable key changes.
  const stripePromise = useMemo(
    () => (session ? getStripe(session.publishableKey) : null),
    [session?.publishableKey],
  );

  const options: StripeElementsOptions | undefined = session
    ? { clientSecret: session.clientSecret, appearance: { theme: 'stripe' } }
    : undefined;

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {session ? t('subscription.payTitle', { plan: t(`plans.${session.plan}.name`) }) : ''}
          </DialogTitle>
          <DialogDescription>{t('subscription.payDescription')}</DialogDescription>
        </DialogHeader>

        {session && stripePromise && options && (
          // `key` forces a fresh Elements tree per PaymentIntent so a retried
          // checkout never reuses a stale client secret.
          <Elements key={session.clientSecret} stripe={stripePromise} options={options}>
            <CheckoutForm session={session} onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CheckoutForm({
  session,
  onSuccess,
  onClose,
}: {
  session: CheckoutSession;
  onSuccess: (sub: Subscription) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const amountLabel = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: session.currency.toUpperCase(),
      }).format(session.amount / 100),
    [i18n.language, session.amount, session.currency],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError('');
    setSubmitting(true);
    try {
      // Confirm the card with Stripe directly from the browser. `redirect:
      // 'if_required'` keeps us on-page for cards and returns the PaymentIntent.
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        // Stays on-page for cards; `return_url` is only used if the shopper
        // picks a redirect-based method (required by Stripe when set).
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message ?? t('subscription.paymentError'));
        return;
      }

      if (paymentIntent?.status !== 'succeeded') {
        setError(t('subscription.paymentError'));
        return;
      }

      // Real-time server-side verification: the API re-reads the PaymentIntent
      // from Stripe and only then upgrades the plan. We never trust the client.
      const updated = await subscriptionsApi.confirm(session.paymentIntentId);
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('subscription.paymentError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        {t('subscription.securedByStripe')}
      </p>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={submitting}
          onClick={onClose}
        >
          {t('subscription.cancel')}
        </Button>
        <Button type="submit" className="flex-1" disabled={!stripe || submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('subscription.processing')}
            </>
          ) : (
            t('subscription.pay', { amount: amountLabel })
          )}
        </Button>
      </div>
    </form>
  );
}
