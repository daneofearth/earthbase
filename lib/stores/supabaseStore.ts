/**
 * Preset storage in Supabase.
 *
 * Used whenever SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both present.
 * This is what lets the tuner work on the live site: the deployed filesystem is
 * read-only, but a database is not.
 *
 * Everything here runs server-side with the service-role key, which bypasses
 * RLS. That key must never reach the browser — it is read from the environment
 * and used only inside route handlers and server components. The tables
 * themselves have RLS on with no policies, so a leaked anon key still cannot
 * touch them.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULTS, resolveConfig, type EarthConfig } from '../earthConfig'
import type { PresetStore, PresetSummary } from './types'

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let client: SupabaseClient | null = null

/** The service-role client. Server-side only — this key bypasses RLS. */
export function serviceClient(): SupabaseClient {
  return db()
}

function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      // No session to persist and nothing to refresh — this is a server
      // process holding a service key, not a signed-in user.
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  }
  return client
}

type Row = { slug: string; name: string; config: unknown; saved_at: string }

function toSummary(row: Row): PresetSummary {
  return {
    slug: row.slug,
    name: row.name,
    savedAt: row.saved_at,
    values: resolveConfig(row.config),
  }
}

async function getActiveSlug(): Promise<string | null> {
  const { data, error } = await db().from('earth_active').select('slug').eq('id', 1).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.slug ?? null
}

export const supabaseStore: PresetStore = {
  kind: 'supabase',
  writable: true,

  async listPresets() {
    const { data, error } = await db()
      .from('earth_presets')
      .select('slug, name, config, saved_at')
      .order('name')
    if (error) throw new Error(error.message)
    return (data as Row[]).map(toSummary)
  },

  async readPreset(slug) {
    if (!SAFE_SLUG.test(slug)) return null
    const { data, error } = await db()
      .from('earth_presets')
      .select('config')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? resolveConfig(data.config) : null
  },

  async writePreset(slug, name, values, savedAt) {
    if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    const config = resolveConfig(values)
    const { error } = await db()
      .from('earth_presets')
      // Upsert so reusing a name overwrites that look, matching the tuner's
      // stated behaviour rather than erroring on the primary key.
      .upsert({ slug, name, config, saved_at: savedAt }, { onConflict: 'slug' })
    if (error) throw new Error(error.message)
    return { slug, name, savedAt, values: config }
  },

  async deletePreset(slug) {
    if (!SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    // earth_active.slug is ON DELETE SET NULL, so the pointer clears itself and
    // the site falls back to defaults rather than referencing a missing row.
    const { error } = await db().from('earth_presets').delete().eq('slug', slug)
    if (error) throw new Error(error.message)
  },

  getActiveSlug,

  async setActiveSlug(slug) {
    if (slug !== null && !SAFE_SLUG.test(slug)) throw new Error('Invalid preset name.')
    const { error } = await db().from('earth_active').update({ slug }).eq('id', 1)
    if (error) throw new Error(error.message)
  },

  async getActiveConfig(): Promise<EarthConfig> {
    const slug = await getActiveSlug()
    if (!slug) return DEFAULTS
    return (await this.readPreset(slug)) ?? DEFAULTS
  },
}
