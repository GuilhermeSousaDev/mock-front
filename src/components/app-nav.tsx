'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LogOut, AudioLines } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/language-switcher';
import { clearToken } from '@/lib/api';
import { Plan } from '@/types/enums';
import type { User } from '@/types/api';

export function AppNav({ user }: { user: User | null }) {
  const router = useRouter();
  const { t } = useTranslation();
  const plan = user?.subscription?.plan ?? Plan.FREE;

  function signOut() {
    clearToken();
    router.replace('/login');
  }

  return (
    <nav className="border-b border-border/50 sticky top-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Brand */}
          <Link href="/dashboard" className="group flex items-center gap-2.5 mr-2 sm:mr-4 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
              <AudioLines className="h-5 w-5" />
            </span>
            <span className="font-semibold text-lg tracking-tight">{t('common.appName')}</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {t('nav.dashboard')}
          </Link>
          <Link
            href="/subscription"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {t('nav.subscription')}
          </Link>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <LanguageSwitcher />
          <Link href="/subscription">
            <Badge variant={plan === Plan.FREE ? 'secondary' : 'default'}>
              {t(`plans.${plan}.name`)}
            </Badge>
          </Link>
          {user && <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={t('common.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
