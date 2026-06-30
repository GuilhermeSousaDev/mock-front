'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LoginForm } from './login-form';
import { AuthShell } from '../auth-shell';

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            {t('auth.createAccount')}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
