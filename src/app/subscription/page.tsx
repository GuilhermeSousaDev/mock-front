'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckoutDialog } from '@/components/subscription/checkout-dialog';
import { subscriptions as subscriptionsApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Plan } from '@/types/enums';
import type { CheckoutSession, Subscription } from '@/types/api';

const PLAN_ORDER: Plan[] = [Plan.FREE, Plan.PRO, Plan.PREMIUM];

export default function SubscriptionPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [changing, setChanging] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [session, setSession] = useState<CheckoutSession | null>(null);

  useEffect(() => {
    if (!user) return;
    setSub(user.subscription ?? null);
    subscriptionsApi.get().then(setSub).catch(() => {});
  }, [user]);

  async function selectPlan(plan: Plan) {
    setError('');
    setSuccess('');
    setChanging(plan);
    try {
      if (plan === Plan.FREE) {
        // Downgrades are free and applied immediately.
        setSub(await subscriptionsApi.changePlan(plan));
      } else {
        // Paid plans: open Stripe Elements with a fresh PaymentIntent.
        setSession(await subscriptionsApi.checkout(plan));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('subscription.changeError'));
    } finally {
      setChanging(null);
    }
  }

  function handleSuccess(updated: Subscription) {
    setSub(updated);
    setSession(null);
    setSuccess(t('subscription.paymentSuccess', { plan: t(`plans.${updated.plan}.name`) }));
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </main>
    );
  }

  const currentPlan = sub?.plan ?? Plan.FREE;

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={{ ...user, subscription: sub }} />
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">{t('subscription.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subscription.onPlan', { plan: t(`plans.${currentPlan}.name`) })}
            {sub?.currentPeriodEnd &&
              ` ${t('subscription.renews', { date: new Date(sub.currentPeriodEnd).toLocaleDateString() })}`}
          </p>
        </header>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = plan === currentPlan;
            const features = t(`plans.${plan}.features`, {
              returnObjects: true,
            }) as unknown as string[];
            return (
              <div
                key={plan}
                className={cn(
                  'rounded-2xl border bg-card p-6 flex flex-col gap-4',
                  isCurrent ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">{t(`plans.${plan}.name`)}</h2>
                  {isCurrent && <Badge>{t('subscription.current')}</Badge>}
                </div>
                <p className="text-2xl font-bold">{t(`plans.${plan}.price`)}</p>
                <ul className="space-y-2 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || changing !== null}
                  onClick={() => selectPlan(plan)}
                >
                  {isCurrent
                    ? t('subscription.currentPlan')
                    : changing === plan
                      ? t('subscription.updating')
                      : plan === Plan.FREE
                        ? t('subscription.downgrade')
                        : t('subscription.choosePlan')}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{t('subscription.testCardNote')}</p>

        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('common.back')}
        </button>
      </div>

      <CheckoutDialog
        session={session}
        onClose={() => setSession(null)}
        onSuccess={handleSuccess}
      />
    </main>
  );
}
