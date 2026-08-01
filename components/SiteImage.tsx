'use client'

import { useEffect, useRef } from 'react'
import { resolveConfig, type EarthConfig } from '@/lib/earthConfig'

/**
 * The floating image, and its arrival and departure.
 *
 * Two nested elements on purpose.
 *
 * The outer one holds where the picture *lives* — position and size, straight
 * from config. Keeping that separate is what makes the resting state the real
 * state: if the animation never runs, because a visitor asked for reduced
 * motion or a script died, the picture is still exactly where it belongs at the
 * right size. The animation is decoration on top, never the thing that puts it
 * there.
 *
 * The inner one carries every animated property in a single transform, so
 * growing, travelling and turning cannot finish at different moments. See
 * ARRIVING for why that matters.
 */

/**
 * One curve per phase, shared by everything that moves.
 *
 * An earlier version gave rotation its own, gentler curve to stop a multi-turn
 * spin appearing to stall. That fixed the stall and introduced a worse problem:
 * size and rotation then ran on different curves, so the image reached full
 * size while it was still turning. Two halves of one motion disagreeing is what
 * reads as jerky. Whatever curve is chosen, growing, travelling and turning
 * have to finish together.
 *
 * The curves themselves are also moderate now. The old default completed 87% of
 * its travel in the first 30% of the time — fine for a short slide, but on
 * three turns it whipped through two and a half of them and then crept the last
 * half-turn over a full second. These reach roughly two thirds of the way at
 * the half-way point, so motion stays visible for the whole duration instead of
 * front-loading and trailing off.
 */
const ARRIVING: Record<string, string> = {
  linear: 'linear',
  glide: 'cubic-bezier(0.5, 1, 0.89, 1)',
  overshoot: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
}

/**
 * Departure curves — the mirror images.
 *
 * An arrival decelerates into place; a departure accelerates away. Reusing the
 * arrival curves would make the image crawl out, which reads as hesitation
 * rather than leaving.
 */
const LEAVING: Record<string, string> = {
  linear: 'linear',
  glide: 'cubic-bezier(0.11, 0, 0.5, 0)',
  anticipate: 'cubic-bezier(0.36, 0, 0.66, -0.36)',
}

const PIVOT: Record<string, string> = {
  center: 'center center',
  bottom: 'center bottom',
  top: 'center top',
  left: 'left center',
  right: 'right center',
}

/**
 * Only http(s) and same-origin paths.
 *
 * This value is typed into a box and stored in a database, then handed to an
 * `src`. Without a check, `javascript:` and `data:text/html` are both things
 * someone could put there.
 */
function safeSrc(src: string): string | null {
  const value = src.trim()
  if (!value) return null
  if (value.startsWith('/')) return value
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

type Frame = { offset: number; transform: string; opacity?: number; easing?: string }

export default function SiteImage({
  config,
  replayToken = 0,
}: {
  config: Partial<EarthConfig>
  /** Bumping this re-runs the whole timeline — the tuner's Replay button. */
  replayToken?: number
}) {
  const c = resolveConfig(config)
  const stage = useRef<HTMLDivElement>(null)
  const src = safeSrc(c.imageSrc)

  useEffect(() => {
    const el = stage.current
    if (!el || !src) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Arrival, hold and departure are one timeline rather than three chained
    // animations. Chaining leaves a seam: a dropped timer or a slow frame shows
    // up as a stutter between phases, and replaying means cancelling a
    // half-finished chain. One timeline cannot get out of step with itself.
    const arriveFor = c.fxEnabled ? c.fxDuration : 0
    const holdFor = c.fxExitEnabled ? c.fxHold : 0
    const leaveFor = c.fxExitEnabled ? c.fxExitDuration : 0
    const total = arriveFor + holdFor + leaveFor
    if (total <= 0) return

    const arrived = arriveFor / total
    const leaves = (arriveFor + holdFor) / total

    const arriveEase = ARRIVING[c.fxLanding] ?? ARRIVING.linear
    const leaveEase = LEAVING[c.fxExitLeaving] ?? LEAVING.linear

    // Where it comes from, as a delta from where it rests, so the resting
    // position stays the single source of truth for both.
    const dx = (c.fxStartX - c.imageX) * 50
    const dy = -(c.fxStartY - c.imageY) * 50
    // Starts at -spin and arrives at 0, so a positive count reads clockwise.
    const spin = c.fxSpins * 360
    // Drift, not an absolute point: 0 leaves it where it sits rather than
    // sliding to the middle of the screen on the way out.
    const ex = c.fxExitDriftX * 50
    const ey = -c.fxExitDriftY * 50
    const exitSpin = c.fxExitSpins * 360

    // One list, one transform, one curve per segment. Everything that moves is
    // in here together, which is the only way growing, travelling and turning
    // can be guaranteed to finish at the same instant.
    const frames: Frame[] = []
    const rest = (offset: number, easing?: string): Frame => ({
      offset,
      transform: 'translate(0vw, 0vh) rotate(0deg) scale(1)',
      opacity: 1,
      easing,
    })

    if (arriveFor > 0) {
      frames.push({
        offset: 0,
        transform: `translate(${dx}vw, ${dy}vh) rotate(${-spin}deg) scale(${c.fxStartScale})`,
        opacity: c.fxFade ? 0 : 1,
        easing: arriveEase,
      })
      if (c.fxArc > 0) {
        // A lifted midpoint bends the path into a curve instead of a rail.
        frames.push({
          offset: arrived / 2,
          transform: `translate(${dx / 2}vw, ${dy / 2 - c.fxArc}vh) rotate(${-spin / 2}deg) scale(${(c.fxStartScale + 1) / 2})`,
          opacity: 1,
          easing: arriveEase,
        })
      }
      if (c.fxWobble > 0) {
        // Home, but rotated slightly past; the next frame rocks it back.
        frames.push({
          offset: arrived * 0.85,
          transform: `translate(0vw, 0vh) rotate(${c.fxWobble * (c.fxSpins < 0 ? -1 : 1)}deg) scale(1)`,
          opacity: 1,
          easing: arriveEase,
        })
      }
    }

    // With no hold, the arrival frame is also the frame the departure starts
    // from, so it carries the leaving curve rather than a separate one.
    frames.push(rest(arrived, leaveFor > 0 && holdFor === 0 ? leaveEase : 'linear'))
    if (leaveFor > 0 && holdFor > 0) frames.push(rest(leaves, leaveEase))

    if (leaveFor > 0) {
      if (c.fxExitArc !== 0) {
        frames.push({
          offset: (leaves + 1) / 2,
          transform: `translate(${ex / 2}vw, ${ey / 2 - c.fxExitArc}vh) rotate(${exitSpin / 2}deg) scale(${(1 + c.fxExitScale) / 2})`,
          opacity: c.fxExitFade ? 0.5 : 1,
          easing: leaveEase,
        })
      }
      frames.push({
        offset: 1,
        transform: `translate(${ex}vw, ${ey}vh) rotate(${exitSpin}deg) scale(${c.fxExitScale})`,
        opacity: c.fxExitFade ? 0 : 1,
      })
    }

    // Linear at the effect level so the per-keyframe curves govern each segment
    // on its own; `both` holds the start state through the delay and the end
    // state after, so nothing flashes into place before it begins.
    const animation = el.animate(frames, {
      duration: total * 1000,
      delay: c.fxDelay * 1000,
      easing: 'linear',
      fill: 'both',
    })

    return () => animation.cancel()
  }, [
    src,
    replayToken,
    c.fxEnabled,
    c.fxDuration,
    c.fxDelay,
    c.fxSpins,
    c.fxStartScale,
    c.fxStartX,
    c.fxStartY,
    c.fxLanding,
    c.fxFade,
    c.fxArc,
    c.fxWobble,
    c.imageX,
    c.imageY,
    c.fxExitEnabled,
    c.fxHold,
    c.fxExitDuration,
    c.fxExitFade,
    c.fxExitScale,
    c.fxExitSpins,
    c.fxExitDriftX,
    c.fxExitDriftY,
    c.fxExitLeaving,
    c.fxExitArc,
  ])

  if (!c.imageShow || !src) return null

  const pivot = PIVOT[c.fxPivot] ?? 'center center'

  return (
    <div
      aria-hidden={c.imageAlt ? undefined : true}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${c.imageWidth}vw`,
        transform: `translate(-50%, -50%) translate(${c.imageX * 50}vw, ${-c.imageY * 50}vh)`,
        opacity: c.imageOpacity,
        pointerEvents: 'none',
      }}
    >
      <div ref={stage} style={{ transformOrigin: pivot }}>
        {/* Plain <img>: the source is an arbitrary URL the user supplies, which
            next/image cannot optimise without allow-listing every possible
            host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={c.imageAlt}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            transform: c.imageFlip ? 'scaleX(-1)' : undefined,
            filter:
              c.imageGlow > 0
                ? `drop-shadow(0 0 ${c.imageGlow}px rgba(255,255,255,0.45))`
                : undefined,
          }}
        />
      </div>
    </div>
  )
}
