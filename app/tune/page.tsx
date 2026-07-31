/**
 * The tuner is a local development tool, not part of the site.
 *
 * It 404s anywhere else, because its whole purpose is writing files and the
 * deployed filesystem is read-only — a tuner on the live site would present
 * controls whose Save button could never work.
 */

import { notFound } from 'next/navigation'
import { getActiveConfig, getActiveSlug, isWritable, listPresets } from '@/lib/earthConfigStore'
import Tuner from './Tuner'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Tune the globe' }

export default async function TunePage() {
  if (!isWritable()) notFound()

  // Read here rather than fetched from the client on mount: the list arrives
  // with the page instead of popping in a moment later, and the tuner is left
  // with no load-on-mount effect at all.
  return (
    <Tuner
      initial={await getActiveConfig()}
      presets={await listPresets()}
      activeSlug={await getActiveSlug()}
    />
  )
}
