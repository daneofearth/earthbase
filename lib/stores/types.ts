import type { EarthConfig } from '../earthConfig'

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

/**
 * The one interface both storage backends implement, so the API routes and the
 * pages never learn which one is in play.
 */
export type PresetStore = {
  kind: 'file' | 'supabase'
  /** Whether saving can work at all here, before any question of permission. */
  writable: boolean

  listPresets(): Promise<PresetSummary[]>
  readPreset(slug: string): Promise<EarthConfig | null>
  writePreset(
    slug: string,
    name: string,
    values: unknown,
    savedAt: string,
  ): Promise<PresetSummary>
  deletePreset(slug: string): Promise<void>
  getActiveSlug(): Promise<string | null>
  setActiveSlug(slug: string | null): Promise<void>
  getActiveConfig(): Promise<EarthConfig>
}
