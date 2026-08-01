/**
 * Uploads an image and hands back a public URL.
 *
 * The bucket is created on first use rather than being a setup step someone has
 * to remember — a missing bucket would otherwise surface as an opaque storage
 * error the first time anyone tried to upload.
 */

import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseConfigured, serviceClient } from '@/lib/stores/supabaseStore'
import { canTune } from '@/lib/tuneAccess'

export const dynamic = 'force-dynamic'

const BUCKET = 'site-images'
const MAX_BYTES = 10 * 1024 * 1024

// Raster and SVG differ in kind: an SVG is a document that can carry script, so
// it is not accepted here even though it is nominally an image.
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

export async function POST(request: Request) {
  if (!(await canTune())) {
    return NextResponse.json({ error: 'Locked.' }, { status: 401 })
  }
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: 'Uploads need Supabase configured. Paste an image URL instead.' },
      { status: 503 },
    )
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `${file.type || 'That file type'} is not accepted. Use PNG, JPEG, WebP, GIF or AVIF.` },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 10MB.` },
      { status: 400 },
    )
  }

  const supabase = serviceClient()

  // createBucket errors harmlessly if it already exists, which is cheaper than
  // listing every bucket on each upload.
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const bytes = Buffer.from(await file.arrayBuffer())
  // Content-hashed, so re-uploading the same picture reuses one object instead
  // of littering the bucket, and no user-supplied filename reaches storage.
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
  const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${hash}.${extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
