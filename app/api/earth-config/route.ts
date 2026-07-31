/**
 * Preset storage for the tuner.
 *
 * GET is harmless anywhere. POST and DELETE write files and therefore only work
 * locally — the store refuses in any other environment rather than failing
 * confusingly against a read-only filesystem.
 */

import { NextResponse } from 'next/server'
import { resolveConfig, slugify } from '@/lib/earthConfig'
import {
  deletePreset,
  getActiveConfig,
  getActiveSlug,
  isWritable,
  listPresets,
  NotWritableError,
  writePreset,
} from '@/lib/earthConfigStore'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    presets: await listPresets(),
    activeSlug: await getActiveSlug(),
    active: await getActiveConfig(),
    writable: isWritable(),
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; values?: unknown }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
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

    const saved = await writePreset(name, resolveConfig(body.values), slug, new Date().toISOString())
    return NextResponse.json({ saved, presets: await listPresets() })
  } catch (error) {
    if (error instanceof NotWritableError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('slug') ?? ''
    await deletePreset(slug)
    return NextResponse.json({
      presets: await listPresets(),
      activeSlug: await getActiveSlug(),
    })
  } catch (error) {
    if (error instanceof NotWritableError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
