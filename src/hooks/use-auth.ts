'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { users, getToken, clearToken, ApiError } from '@/lib/api';
import type { User } from '@/types/api';

/**
 * Client-side auth guard. Loads the current user and redirects to /login when
 * there is no token or the token is rejected.
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    users
      .me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}

/**
 * For public auth pages (/login, /signup): when the stored session is still
 * valid, skip the form and resume straight into the dashboard.
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    users
      .me()
      .then(() => router.replace('/dashboard'))
      .catch(() => {
        // Stale/invalid token — already cleared by the api client on 401;
        // stay on the form.
      });
  }, [router]);
}
