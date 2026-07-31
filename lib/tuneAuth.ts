/**
 * Who is allowed to change what the site looks like.
 *
 * Once presets live in a database, /tune stops being a local-only tool and
 * becomes a writable endpoint on a public site whose source is a public repo.
 * The URL is not a secret and cannot be treated as one, so it needs an actual
 * lock. This is that lock: one shared password, no accounts, no registration.
 *
 * Three states:
 *   - development           → open, no password, no friction
 *   - TUNE_PASSWORD set     → password required, session kept in a signed cookie
 *   - TUNE_PASSWORD unset   → /tune does not exist in production
 *
 * The last one is the important one. Failing closed means there is never a
 * window where the live site is publicly rewritable because an environment
 * variable had not been filled in yet.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'tune_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function password(): string {
  return process.env.TUNE_PASSWORD ?? ''
}

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

/** Whether the tuner exists here at all. */
export function tunerEnabled(): boolean {
  return isDev() || Boolean(password())
}

/**
 * The cookie value: an HMAC of a fixed string keyed by the password.
 *
 * Storing a derivative rather than the password itself means the cookie cannot
 * be read back into the secret, and changing TUNE_PASSWORD invalidates every
 * existing session for free.
 */
function sessionToken(): string {
  return createHmac('sha256', password()).update('tune-session-v1').digest('hex')
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function isUnlocked(): Promise<boolean> {
  if (isDev()) return true
  if (!password()) return false
  const cookie = (await cookies()).get(COOKIE)?.value
  return Boolean(cookie) && constantTimeEqual(cookie!, sessionToken())
}

/** Checks an attempt and, if it is right, starts a session. */
export async function unlock(attempt: string): Promise<boolean> {
  if (!password()) return false
  if (!constantTimeEqual(attempt, password())) return false

  ;(await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev(),
    path: '/',
    maxAge: MAX_AGE,
  })
  return true
}

export async function lock(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
