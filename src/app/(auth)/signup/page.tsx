'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SignupForm } from './signup-form';
import { AuthShell } from '../auth-shell';

export default function SignupPage() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
