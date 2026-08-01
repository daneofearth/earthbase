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

/** Landing curves. Constant speed stops dead; the others decelerate. */
const EASING: Record<string, string> = {
  linear: 'linear',
  glide: 'cubic-bezier(0.16, 1, 0.3, 1)',
  overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
    if (!el || !src || !c.fxEnabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Where it starts, expressed as a delta from where it rests, so the resting
    // position stays the single source of truth for both.
    const dx = (c.fxStartX - c.imageX) * 50
    const dy = -(c.fxStartY - c.imageY) * 50
    // Starts at -spin and arrives at 0, so a positive count reads clockwise.
    const spin = c.fxSpins * 360
    const at = (t: number, r: number, s: number, x: number, y: number, o: number) => ({
      offset: t,
      transform: `translate(${x}vw, ${y}vh) rotate(${r}deg) scale(${s})`,
      opacity: o,
    })

    const frames = [at(0, -spin, c.fxStartScale, dx, dy, c.fxFade ? 0 : 1)]

    if (c.fxArc > 0) {
      // A lifted midpoint bends the path into a curve instead of a rail.
      frames.push(at(0.5, -spin / 2, (c.fxStartScale + 1) / 2, dx / 2, dy / 2 - c.fxArc, 1))
    }
    if (c.fxWobble > 0) {
      // Already home, but rotated slightly past — the last frame rocks it back.
      frames.push(at(0.85, c.fxWobble * (c.fxSpins < 0 ? -1 : 1), 1, 0, 0, 1))
    }
    frames.push(at(1, 0, 1, 0, 0, 1))

    const animation = el.animate(frames, {
      duration: c.fxDuration * 1000,
      delay: c.fxDelay * 1000,
      easing: EASING[c.fxLanding] ?? EASING.glide,
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
