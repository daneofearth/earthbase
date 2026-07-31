/**
 * Preset storage for the tuner.
 *
 * Every method is behind the same lock as the tuner page itself — this is the
 * endpoint that decides what the public site looks like, so an unlocked GET
 * would leak it and an unlocked POST would let anyone rewrite the homepage.
 *
 * Writes revalidate `/`, so a preset change reaches visitors immediately
 * instead of waiting for the next deploy or cache expiry.
 */

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { resolveConfig, slugify } from '@/lib/earthConfig'
import {
  deletePreset,
  getActiveConfig,
  getActiveSlug,
  isWritable,
  listPresets,
  NotWritableError,
  store,
  writePreset,
} from '@/lib/earthConfigStore'
import { canTune } from '@/lib/tuneAccess'

export const dynamic = 'force-dynamic'

const LOCKED = NextResponse.json({ error: 'Locked.' }, { status: 401 })

function failed(error: unknown) {
  if (error instanceof NotWritableError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  return NextResponse.json({ error: (error as Error).message }, { status: 400 })
}

export async function GET() {
  if (!(await canTune())) return LOCKED
  try {
    return NextResponse.json({
      presets: await listPresets(),
      activeSlug: await getActiveSlug(),
      active: await getActiveConfig(),
      writable: isWritable(),
      backend: store().kind,
    })
  } catch (error) {
    return failed(error)
  }
}

export async function POST(request: Request) {
  if (!(await canTune())) return LOCKED
  try {
    // A malformed body is a bad request, not a server fault.
    const body = (await request.json().catch(() => null)) as {
      name?: unknown
      values?: unknown
    } | null

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Give the preset a name.' }, { status: 400 })
    }

    const slug = slugify(name)
    if (!slug) {
      return NextResponse.json(
        { error: 'That name has no letters or numbers in it.' },
        { status: 400 },
      )
    }

    const saved = await writePreset(slug, name, resolveConfig(body?.values), new Date().toISOString())

    // Saving over the preset that is currently live changes the public page.
    if ((await getActiveSlug()) === slug) revalidatePath('/')

    return NextResponse.json({ saved, presets: await listPresets() })
  } catch (error) {
    return failed(error)
  }
}

export async function DELETE(request: Request) {
  if (!(await canTune())) return LOCKED
  try {
    const slug = new URL(request.url).searchParams.get('slug') ?? ''
    const wasActive = (await getActiveSlug()) === slug

    await deletePreset(slug)
    if (wasActive) revalidatePath('/')

    return NextResponse.json({
      presets: await listPresets(),
      activeSlug: await getActiveSlug(),
    })
  } catch (error) {
    return failed(error)
  }
}
