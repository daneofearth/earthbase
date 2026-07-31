/**
 * Preset storage as JSON files in config/earth/.
 *
 * The fallback, used only when Supabase is not configured. It keeps local
 * development working before any keys are pasted in, and it is why a fresh
 * clone with no environment at all still runs.
 *
 * Writing is development-only: the deployed filesystem is read-only, so a save
 * against it would fail confusingly rather than usefully.
 */

import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULTS, resolveConfig, type EarthConfig } from '../earthConfig'
import type { PresetStore, PresetSummary } from './types'

const DIR = path.join(process.cwd(), 'config', 'earth')
const ACTIVE_FILE = path.join(DIR, '_active.json')

/** Filenames come from the client on delete/activate, so never trust them. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function listPresets(): Promise<PresetSummary[]> {
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

async function getActiveSlug(): Promise<string | null> {
  const data = (await readJson(ACTIVE_FILE)) as { preset?: unknown } | null
  const slug = data?.preset
  return typeof slug === 'string' && SAFE_SLUG.test(slug) ? slug : null
}

export const fileStore: PresetStore = {
  kind: 'file',

  // Only a dev machine can write here; see the module comment.
  writable: process.env.NODE_ENV === 'development',

  listPresets,
  getActiveSlug,

  async readPreset(slug) {
    if (!SAFE_SLUG.test(slug)) return null
    const data = (await readJson(path.join(DIR, `${slug}.json`))) as { values?: unknown } | null
    return data ? resolveConfig(data.values) : null
  },

  async writePreset(slug, name, values, savedAt) {
    if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    await mkdir(DIR, { recursive: true })
    // Stored resolved, so a file on disk is always a complete, in-range config
    // and never a half-written fragment.
    const config = resolveConfig(values)
    const body = { name, savedAt, values: config }
    await writeFile(path.join(DIR, `${slug}.json`), JSON.stringify(body, null, 2) + '\n')
    return { slug, name, savedAt, values: config }
  },

  async deletePreset(slug) {
    if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    await unlink(path.join(DIR, `${slug}.json`)).catch(() => {})
    if ((await getActiveSlug()) === slug) await this.setActiveSlug(null)
  },

  async setActiveSlug(slug) {
    if (slug !== null && !SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    await mkdir(DIR, { recursive: true })
    await writeFile(ACTIVE_FILE, JSON.stringify({ preset: slug }, null, 2) + '\n')
  },

  async getActiveConfig(): Promise<EarthConfig> {
    const slug = await getActiveSlug()
    if (!slug) return DEFAULTS
    return (await this.readPreset(slug)) ?? DEFAULTS
  },
}
