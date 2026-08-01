'use client'

import { useEffect, useRef } from 'react'
import { resolveConfig, type EarthConfig } from '@/lib/earthConfig'

/**
 * The floating image, and its arrival.
 *
 * Two nested elements on purpose. The outer one holds where the picture *lives*
 * — position and size, straight from config. The inner one is the only thing
 * the animation touches. Keeping them apart is what makes the resting state the
 * real state: if the entrance never runs, because a visitor asked for reduced
 * motion or the browser is old or a script died, the picture is still exactly
 * where it belongs at the right size. The animation is decoration on top, never
 * the thing that puts it there.
 */

/** Landing curves. Constant speed stops dead; the others decelerate in. */
const ARRIVING: Record<string, string> = {
  linear: 'linear',
  glide: 'cubic-bezier(0.16, 1, 0.3, 1)',
  overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
  glide: 'cubic-bezier(0.7, 0, 0.84, 0)',
  anticipate: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
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

export default function SiteImage({
  config,
  replayToken = 0,
}: {
  config: Partial<EarthConfig>
  /** Bumping this re-runs the entrance — the tuner's Replay button. */
  replayToken?: number
}) {
  const c = resolveConfig(config)
  const inner = useRef<HTMLDivElement>(null)
  const src = safeSrc(c.imageSrc)

  useEffect(() => {
    const el = inner.current
    if (!el || !src) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Arrival, hold and departure are one animation rather than three chained
    // ones. Chaining leaves a seam: a dropped timer or a slow frame shows up as
    // a visible stutter between phases, and replaying means cancelling a
    // half-finished chain. A single timeline cannot get out of step with itself.
    const arriveFor = c.fxEnabled ? c.fxDuration : 0
    const holdFor = c.fxExitEnabled ? c.fxHold : 0
    const leaveFor = c.fxExitEnabled ? c.fxExitDuration : 0
    const total = arriveFor + holdFor + leaveFor
    if (total <= 0) return

    const arrived = arriveFor / total
    const leaves = (arriveFor + holdFor) / total

    type Frame = {
      offset: number
      transform: string
      opacity: number
      easing?: string
    }
    const at = (
      offset: number,
      rotate: number,
      scale: number,
      x: number,
      y: number,
      opacity: number,
      easing?: string,
    ): Frame => ({
      offset,
      transform: `translate(${x}vw, ${y}vh) rotate(${rotate}deg) scale(${scale})`,
      opacity,
      easing,
    })
    /** Where the image belongs: no offset, upright, full size. */
    const resting = (offset: number, easing?: string) => at(offset, 0, 1, 0, 0, 1, easing)

    const frames: Frame[] = []
    const arriveEase = ARRIVING[c.fxLanding] ?? ARRIVING.glide
    const leaveEase = LEAVING[c.fxExitLeaving] ?? LEAVING.glide

    if (arriveFor > 0) {
      // Where it starts, as a delta from where it rests, so the resting
      // position stays the single source of truth for both.
      const dx = (c.fxStartX - c.imageX) * 50
      const dy = -(c.fxStartY - c.imageY) * 50
      // Starts at -spin and arrives at 0, so a positive count reads clockwise.
      const spin = c.fxSpins * 360

      frames.push(at(0, -spin, c.fxStartScale, dx, dy, c.fxFade ? 0 : 1, arriveEase))
      if (c.fxArc > 0) {
        // A lifted midpoint bends the path into a curve instead of a rail.
        frames.push(
          at(arrived / 2, -spin / 2, (c.fxStartScale + 1) / 2, dx / 2, dy / 2 - c.fxArc, 1, arriveEase),
        )
      }
      if (c.fxWobble > 0) {
        // Already home, but rotated slightly past — the next frame rocks it back.
        frames.push(at(arrived * 0.85, c.fxWobble * (c.fxSpins < 0 ? -1 : 1), 1, 0, 0, 1, arriveEase))
      }
    }

    // With no hold, the arrival frame is also the frame the departure starts
    // from, so it carries the leaving curve instead of a separate one.
    frames.push(resting(arrived, leaveFor > 0 && holdFor === 0 ? leaveEase : 'linear'))
    if (leaveFor > 0 && holdFor > 0) frames.push(resting(leaves, leaveEase))

    if (leaveFor > 0) {
      // Drift, not an absolute point: 0 means it leaves from where it sits
      // rather than sliding to the middle of the screen on its way out.
      const ex = c.fxExitDriftX * 50
      const ey = -c.fxExitDriftY * 50
      const exitSpin = c.fxExitSpins * 360

      if (c.fxExitArc !== 0) {
        frames.push(
          at(
            (leaves + 1) / 2,
            exitSpin / 2,
            (1 + c.fxExitScale) / 2,
            ex / 2,
            ey / 2 - c.fxExitArc,
            c.fxExitFade ? 0.5 : 1,
            leaveEase,
          ),
        )
      }
      frames.push(at(1, exitSpin, c.fxExitScale, ex, ey, c.fxExitFade ? 0 : 1))
    }

    const animation = el.animate(frames, {
      duration: total * 1000,
      delay: c.fxDelay * 1000,
      // Linear at the effect level so the per-keyframe curves above govern each
      // segment on its own — otherwise arrival and departure share one curve.
      easing: 'linear',
      // `both` holds the start state through the delay and the end state after,
      // so there is no flash of the final position before it begins.
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
      <div ref={inner} style={{ transformOrigin: PIVOT[c.fxPivot] ?? 'center center' }}>
        {/* Plain <img>: the source is an arbitrary URL the user supplies, which
            next/image cannot optimise without every host being allow-listed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={c.imageAlt}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            transform: c.imageFlip ? 'scaleX(-1)' : undefined,
            filter: c.imageGlow > 0 ? `drop-shadow(0 0 ${c.imageGlow}px rgba(255,255,255,0.45))` : undefined,
          }}
        />
      </div>
    </div>
  )
}
