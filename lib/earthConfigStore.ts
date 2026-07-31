/**
 * Picks a storage backend and hands back one interface.
 *
 * Supabase when it is configured, JSON files otherwise. Nothing that imports
 * this needs to know which — and the file fallback means a fresh clone with no
 * environment variables still runs, it just cannot save from the deployed site.
 *
 * Server-side only: importing this from a client component will fail on `fs`.
 */

import { DEFAULTS, type EarthConfig } from './earthConfig'
import { fileStore } from './stores/fileStore'
import { supabaseConfigured, supabaseStore } from './stores/supabaseStore'
import type { PresetStore, PresetSummary } from './stores/types'

export type { PresetSummary } from './stores/types'

export function store(): PresetStore {
  return supabaseConfigured() ? supabaseStore : fileStore
}

/** Whether this backend can be written to at all, before any permission check. */
export function isWritable(): boolean {
  return store().writable
}

export class NotWritableError extends Error {
  constructor() {
    super(
      'Presets can only be saved when Supabase is configured, or when running ' +
        'locally against the file store. The deployed filesystem is read-only.',
    )
  }
}

export function assertWritable() {
  if (!isWritable()) throw new NotWritableError()
}

export const listPresets = (): Promise<PresetSummary[]> => store().listPresets()
export const readPreset = (slug: string) => store().readPreset(slug)
export const getActiveSlug = () => store().getActiveSlug()

export async function writePreset(
  slug: string,
  name: string,
  values: unknown,
  savedAt: string,
): Promise<PresetSummary> {
  assertWritable()
  return store().writePreset(slug, name, values, savedAt)
}

export async function deletePreset(slug: string): Promise<void> {
  assertWritable()
  return store().deletePreset(slug)
}

export async function setActiveSlug(slug: string | null): Promise<void> {
  assertWritable()
  return store().setActiveSlug(slug)
}

/**
 * What the public site renders.
 *
 * Falls back to the built-in defaults on any failure — nothing marked active, a
 * deleted preset, or Supabase being unreachable. A database outage should cost
 * the site its custom look, not its homepage.
 */
export async function getActiveConfig(): Promise<EarthConfig> {
  try {
    return await store().getActiveConfig()
  } catch {
    return DEFAULTS
  }
}
