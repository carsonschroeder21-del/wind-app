import { useEffect } from 'react';

import { supabase } from '../services/supabase/client';
import { useAppStore } from '../state/store';

/** Mirrors Supabase's own session state into the store so the rest of the app can read
 * "who's signed in" synchronously. Supabase already persists the session itself (see
 * client.ts's AsyncStorage-backed auth config) — this hook doesn't manage persistence,
 * just keeps a live copy of the current user in sync. Mounted once at the app root, same
 * as the other device/sync hooks. */
export function useSupabaseAuth() {
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      useAppStore.getState().setAuthUser(user ? { id: user.id, email: user.email ?? null } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      useAppStore.getState().setAuthUser(user ? { id: user.id, email: user.email ?? null } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);
}
