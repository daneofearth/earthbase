/**
 * Who is allowed to change what the site looks like.
 *
 * Real accounts now, backed by Supabase Auth — this replaces the single shared
 * TUNE_PASSWORD. Sessions are cookie-based and handled entirely server-side, so
 * no Supabase key of any kind reaches the browser.
 *
 * Two rules, and the second is the one that matters:
 *
 *   1. You must be signed in.
 *   2. Your email must be on TUNE_ALLOWED_EMAILS.
 *
 * Supabase projects accept public sign-ups by default. Without an allowlist,
 * "has an account" would mean "can rewrite the homepage" for anyone who found
 * the URL — and the URL is in a public repo. The allowlist is checked on
 * sign-up *and* on every request, so an account created by some other route
 * still cannot tune.
 *
 * Fail-closed: if auth is not configured, the tuner does not exist in
 * production. There is no window where a half-configured deploy is writable.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function authConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.TUNE_ALLOWED_EMAILS?.trim(),
  )
}

/** Whether /tune exists here at all. */
export function tuneAvailable(): boolean {
  return authConfigured() || isDev()
}

export function allowedEmails(): string[] {
  return (process.env.TUNE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return allowedEmails().includes(email.trim().toLowerCase())
}

/**
 * A Supabase client bound to this request's cookies.
 *
 * Uses the anon key, never the service-role key: this one acts as the signed-in
 * person and must be subject to their permissions. Preset reads and writes go
 * through the separate service-role client in lib/stores/supabaseStore.ts.
 */
export async function authClient() {
  const store = await cookies()

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Server Components cannot set cookies. Refresh writes happen in the
          // route handlers instead, so ignoring it here is safe rather than a
          // silent failure.
        }
      },
    },
  })
}

export type TuneUser = { id: string; email: string }

/** The signed-in user, or null. Verified against Supabase, not just decoded. */
export async function currentUser(): Promise<TuneUser | null> {
  if (!authConfigured()) return null
  const { data, error } = await (await authClient()).auth.getUser()
  if (error || !data.user?.email) return null
  return { id: data.user.id, email: data.user.email }
}

/** The single check the pages and API routes share. */
export async function canTune(): Promise<boolean> {
  // With nothing configured there are no accounts to sign in to, so local
  // development stays open and production has already 404'd via tuneAvailable().
  if (!authConfigured()) return isDev()
  const user = await currentUser()
  return isAllowedEmail(user?.email)
}
