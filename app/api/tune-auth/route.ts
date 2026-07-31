/**
 * Unlocking and locking the tuner.
 *
 * The delay on a wrong password is a blunt instrument, but this endpoint sits
 * on a public URL guarding a single shared secret, and without it the password
 * is only as strong as the attacker's request rate.
 */

import { NextResponse } from 'next/server'
import { lock, tunerEnabled, unlock } from '@/lib/tuneAuth'

export const dynamic = 'force-dynamic'

const WRONG_PASSWORD_DELAY_MS = 1000

export async function POST(request: Request) {
  if (!tunerEnabled()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  // A malformed body is a bad request, not a server fault.
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null
  const attempt = typeof body?.password === 'string' ? body.password : ''

  if (await unlock(attempt)) {
    return NextResponse.json({ ok: true })
  }

  await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS))
  return NextResponse.json({ error: 'Wrong password.' }, { status: 401 })
}

export async function DELETE() {
  await lock()
  return NextResponse.json({ ok: true })
}
