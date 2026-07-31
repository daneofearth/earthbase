/**
 * Where the confirmation email lands.
 *
 * Supabase sends a link carrying a one-time token; exchanging it here is what
 * turns a pending account into a usable session. Without this route the link in
 * the email has nowhere to go and a new account can never be confirmed.
 *
 * Set this as a Redirect URL in the Supabase dashboard:
 *   https://app.daneofearth.org/auth/confirm
 */

import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { authClient, authConfigured } from '@/lib/tuneAccess'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (!authConfigured() || !tokenHash || !type) {
    return NextResponse.redirect(new URL('/tune?error=bad-link', url.origin))
  }

  const supabase = await authClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  return NextResponse.redirect(
    new URL(error ? '/tune?error=expired-link' : '/tune', url.origin),
  )
}
