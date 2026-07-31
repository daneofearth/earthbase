/**
 * Reading and writing the saved globe presets.
 *
 * Presets are plain JSON files in config/earth/ — committed to the repo, so
 * they travel with a deploy and can be edited or diffed by hand. There is no
 * database and, deliberately, no writing at runtime in production: Vercel's
 * filesystem is read-only, so saving only happens on a dev machine and reaches
 * the live site through a commit. See guardWritable().
 *
 * Server-side only — importing this from a client component will fail on `fs`.
 */

import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULTS, resolveConfig, type EarthConfig } from './earthConfig'

const DIR = path.join(process.cwd(), 'config', 'earth')
const ACTIVE_FILE = path.join(DIR, '_active.json')

/** Filenames come from the client on delete/activate, so never trust them. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/

/**
 * Presets carry their full values, not just a name. They are a couple of
 * hundred bytes each, and shipping them with the list means clicking one in the
 * tuner applies instantly instead of waiting on a second request.
 */
export type PresetSummary = {
  slug: string
  name: string
  savedAt: string
  values: EarthConfig
}

export class NotWritableError extends Error {
  constructor() {
    super(
      'Presets can only be saved while running locally (npm run dev). ' +
        'The deployed filesystem is read-only.',
    )
  }
}

/**
 * Saving is a local-development action, not a feature of the live site. This is
 * the one place that decides so — the API routes and the tuner page both defer
 * to it rather than each re-deriving the rule.
 */
export function isWritable(): boolean {
  return process.env.NODE_ENV === 'development'
}

function guardWritable() {
  if (!isWritable()) throw new NotWritableError()
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

export async function listPresets(): Promise<PresetSummary[]> {
  let files: string[]
  try {
    files = await readdir(DIR)
  } catch {
    return []
  }

  const presets: PresetSummary[] = []
  for (const file of files) {
    // `_active.json` is a pointer, not a preset.
    if (!file.endsWith('.json') || file.startsWith('_')) continue
    const slug = file.slice(0, -5)
    if (!SAFE_SLUG.test(slug)) continue

    const data = (await readJson(path.join(DIR, file))) as {
      name?: string
      savedAt?: string
      values?: unknown
    } | null
    presets.push({
      slug,
      name: typeof data?.name === 'string' ? data.name : slug,
      savedAt: typeof data?.savedAt === 'string' ? data.savedAt : '',
      values: resolveConfig(data?.values),
    })
  }

  return presets.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readPreset(slug: string): Promise<EarthConfig | null> {
  if (!SAFE_SLUG.test(slug)) return null
  const data = (await readJson(path.join(DIR, `${slug}.json`))) as { values?: unknown } | null
  if (!data) return null
  return resolveConfig(data.values)
}

export async function writePreset(
  name: string,
  values: unknown,
  slug: string,
  savedAt: string,
): Promise<PresetSummary> {
  guardWritable()
  if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')

  await mkdir(DIR, { recursive: true })
  // Stored resolved rather than raw, so a file on disk is always a complete,
  // in-range config and never a half-written fragment.
  const body = { name, savedAt, values: resolveConfig(values) }
  await writeFile(path.join(DIR, `${slug}.json`), JSON.stringify(body, null, 2) + '\n')
  return { slug, name, savedAt, values: body.values }
}

export async function deletePreset(slug: string): Promise<void> {
  guardWritable()
  if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
  await unlink(path.join(DIR, `${slug}.json`)).catch(() => {})
  if ((await getActiveSlug()) === slug) await setActiveSlug(null)
}

export async function getActiveSlug(): Promise<string | null> {
  const data = (await readJson(ACTIVE_FILE)) as { preset?: unknown } | null
  const slug = data?.preset
  return typeof slug === 'string' && SAFE_SLUG.test(slug) ? slug : null
}

export async function setActiveSlug(slug: string | null): Promise<void> {
  guardWritable()
  if (slug !== null && !SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
  await mkdir(DIR, { recursive: true })
  await writeFile(ACTIVE_FILE, JSON.stringify({ preset: slug }, null, 2) + '\n')
}

/**
 * What the public site renders. Falls back to the built-in defaults whenever
 * nothing is marked active or the active file has gone missing, so the page
 * cannot be broken by a bad or deleted preset.
 */
export async function getActiveConfig(): Promise<EarthConfig> {
  const slug = await getActiveSlug()
  if (!slug) return DEFAULTS
  return (await readPreset(slug)) ?? DEFAULTS
}
