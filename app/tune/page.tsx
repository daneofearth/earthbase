/**
 * The tuning screen.
 *
 * Three outcomes, in order:
 *   - no TUNE_PASSWORD in production → 404, the page does not exist
 *   - password set but no session    → the unlock form
 *   - development, or unlocked       → the tuner
 *
 * The 404 is deliberate. Without it, a deploy that had not had its environment
 * filled in yet would put a working Save button on a public URL.
 */

import { notFound } from 'next/navigation'
import { getActiveConfig, getActiveSlug, isWritable, listPresets, store } from '@/lib/earthConfigStore'
import { isUnlocked, tunerEnabled } from '@/lib/tuneAuth'
import Tuner from './Tuner'
import Unlock from './Unlock'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tune the globe',
  robots: { index: false, follow: false },
}

export default async function TunePage() {
  if (!tunerEnabled()) notFound()
  if (!(await isUnlocked())) return <Unlock />

  // Read here rather than fetched from the client on mount: the list arrives
  // with the page instead of popping in a moment later, and the tuner is left
  // with no load-on-mount effect at all.
  return (
    <Tuner
      initial={await getActiveConfig()}
      presets={await listPresets()}
      activeSlug={await getActiveSlug()}
      backend={store().kind}
      writable={isWritable()}
    />
  )
}
