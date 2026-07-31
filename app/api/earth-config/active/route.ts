/**
 * Marks which preset the public page renders.
 *
 * This is the one setting that changes what visitors see, and it only takes
 * effect once config/earth/_active.json is committed and deployed.
 */

import { NextResponse } from 'next/server'
import { getActiveSlug, NotWritableError, setActiveSlug } from '@/lib/earthConfigStore'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: unknown }
    const slug = typeof body.slug === 'string' && body.slug ? body.slug : null
    await setActiveSlug(slug)
    return NextResponse.json({ activeSlug: await getActiveSlug() })
  } catch (error) {
    if (error instanceof NotWritableError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
