'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SignupForm } from './signup-form';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function SignupPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {t('common.appName')}
          </Link>
          <p className="mt-2 text-muted-foreground text-sm">{t('auth.signupSubtitle')}</p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
