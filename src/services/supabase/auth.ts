import { supabase } from './client';

export type AuthResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED_ERROR = 'Cloud sync is not configured for this build yet.';

/** Emails a 6-digit one-time code to sign in — no password to set or reset. Creates the
 * account automatically on first use for a new email (Supabase's default), so there's no
 * separate sign-up step. */
export async function requestEmailCode(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
