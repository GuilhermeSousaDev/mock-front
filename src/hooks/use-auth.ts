'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { users, getToken, ApiError } from '@/lib/api';
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
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}
