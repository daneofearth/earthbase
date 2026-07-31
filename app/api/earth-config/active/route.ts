/**
 * Marks which preset the public page renders.
 *
 * This is the single request in the app that changes what visitors see, so it
 * revalidates `/` on the way out — the change is live immediately rather than
 * on the next deploy.
 */

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActiveSlug, NotWritableError, setActiveSlug } from '@/lib/earthConfigStore'
import { canTune } from '@/lib/tuneAccess'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!(await canTune())) {
    return NextResponse.json({ error: 'Locked.' }, { status: 401 })
  }

  try {
    // A malformed body is a bad request, not a server fault.
    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null
    const slug = typeof body?.slug === 'string' && body.slug ? body.slug : null

    await setActiveSlug(slug)
    revalidatePath('/')

    return NextResponse.json({ activeSlug: await getActiveSlug() })
  } catch (error) {
    if (error instanceof NotWritableError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
