'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
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
    <nav className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg tracking-tight">
            {t('common.appName')}
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.dashboard')}
          </Link>
          <Link
            href="/recordings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.recordings')}
          </Link>
          <Link
            href="/subscription"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.subscription')}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/subscription">
            <Badge variant={plan === Plan.FREE ? 'secondary' : 'default'}>
              {t(`plans.${plan}.name`)}
            </Badge>
          </Link>
          {user && <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title={t('common.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
