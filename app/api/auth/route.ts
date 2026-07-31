/**
 * Sign in, sign up, sign out.
 *
 * One route with an explicit action rather than three near-identical files —
 * they share all the same guards, and splitting them mostly duplicated those.
 *
 * Every path leaks as little as possible: a wrong password and an unknown
 * account give the same answer, and an email that is not on the allowlist is
 * refused without ever reaching Supabase, so this endpoint cannot be used to
 * discover who has an account.
 */

import { NextResponse } from 'next/server'
import { authClient, authConfigured, isAllowedEmail } from '@/lib/tuneAccess'

export const dynamic = 'force-dynamic'

const WRONG_CREDENTIALS_DELAY_MS = 1000

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown
    email?: unknown
    password?: unknown
  } | null

  const action = typeof body?.action === 'string' ? body.action : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const supabase = await authClient()

  if (action === 'signout') {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  // Checked before anything is sent to Supabase, so a stranger cannot create an
  // account at all — not even an unusable one.
  if (!isAllowedEmail(email)) {
    await new Promise((r) => setTimeout(r, WRONG_CREDENTIALS_DELAY_MS))
    return NextResponse.json({ error: 'That email is not permitted.' }, { status: 403 })
  }

  if (action === 'signup') {
    if (password.length < 10) {
      return NextResponse.json(
        { error: 'Use at least 10 characters.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // No session means the project requires email confirmation. Say so rather
    // than bouncing the user to a tuner they cannot reach yet.
    return NextResponse.json({
      ok: true,
      confirmed: Boolean(data.session),
      message: data.session
        ? 'Account created.'
        : 'Account created. Check your email for the confirmation link, then sign in.',
    })
  }

  if (action === 'signin') {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      await new Promise((r) => setTimeout(r, WRONG_CREDENTIALS_DELAY_MS))
      // Deliberately vague: distinguishing "no such account" from "wrong
      // password" tells an attacker which emails are real.
      return NextResponse.json({ error: 'Email or password is wrong.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
