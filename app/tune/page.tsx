/**
 * The tuning screen.
 *
 * Three outcomes, in order:
 *   - auth not configured, in production → 404, the page does not exist
 *   - configured but not signed in       → the sign-in / create-account form
 *   - signed in on the allowlist, or local dev with nothing configured → tuner
 *
 * The 404 is deliberate. Without it, a deploy whose environment had not been
 * filled in yet would put a working Save button on a public URL.
 */

import { notFound } from 'next/navigation'
import {
  getActiveConfig,
  getActiveSlug,
  isWritable,
  listPresets,
  store,
} from '@/lib/earthConfigStore'
import { canTune, currentUser, tuneAvailable } from '@/lib/tuneAccess'
import AccessGate from './AccessGate'
import Tuner from './Tuner'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tune the globe',
  robots: { index: false, follow: false },
}

const NOTICES: Record<string, string> = {
  'bad-link': 'That confirmation link was not valid.',
  'expired-link': 'That confirmation link has expired. Sign in, or create the account again.',
}

export default async function TunePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (!tuneAvailable()) notFound()

  if (!(await canTune())) {
    const { error } = await searchParams
    return <AccessGate notice={error ? (NOTICES[error] ?? null) : null} />
  }

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
      email={(await currentUser())?.email ?? null}
    />
  )
}
