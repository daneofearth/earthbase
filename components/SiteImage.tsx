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
 * growing, travelling and turning cannot finish at different moments.
 *
 * ## Why the keyframes are generated, not hand-placed
 *
 * Browsers interpolate linearly between keyframes. A hand-placed midpoint —
 * the arc's peak, the wobble's over-rotation — is therefore a corner: the
 * velocity changes discontinuously as the animation passes through it, and a
 * corner in the middle of a spin reads as a jerk. Choosing Linear landing made
 * it worse, because nothing softened the corners.
 *
 * So the trajectory is computed as continuous math — position, angle, scale
 * and opacity as functions of time — and sampled densely (60–240 frames per
 * phase). At that density the piecewise-linear approximation is far below
 * anything the eye can pick up, the arc is a true parabola, the wobble is a
 * smooth swing, and every property shares one clock by construction.
 */

type EasingFn = (t: number) => number

/**
 * Arrival easings, applied to everything that moves at once.
 *
 * Linear is the default: an even rate is predictable and can never look like
 * hesitation. Glide slows toward the end. Overshoot passes slightly beyond and
 * settles back — it may exceed 1 briefly, which is the point.
 */
const ARRIVE_EASE: Record<string, EasingFn> = {
  linear: (u) => u,
  glide: (u) => 1 - (1 - u) * (1 - u),
  overshoot: (u) => {
    const c1 = 1.2
    const c3 = c1 + 1
    const p = u - 1
    return 1 + c3 * p * p * p + c1 * p * p
  },
}

/**
 * Departure easings — the mirror images. An arrival decelerates into place; a
 * departure accelerates away. Anticipate dips negative first: the wind-up.
 */
const LEAVE_EASE: Record<string, EasingFn> = {
  linear: (v) => v,
  glide: (v) => v * v,
  anticipate: (v) => {
    const c1 = 1.2
    const c3 = c1 + 1
    return c3 * v * v * v - c1 * v * v
  },
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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Samples per phase: ~90 per second of motion, within sane bounds. */
function sampleCount(seconds: number): number {
  return Math.min(240, Math.max(60, Math.round(seconds * 90)))
}

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

    const arriveEase = ARRIVE_EASE[c.fxLanding] ?? ARRIVE_EASE.linear
    const leaveEase = LEAVE_EASE[c.fxExitLeaving] ?? LEAVE_EASE.linear

    // Where it comes from, as a delta from where it rests, so the resting
    // position stays the single source of truth for both.
    const dx = (c.fxStartX - c.imageX) * 50
    const dy = -(c.fxStartY - c.imageY) * 50
    // Starts at -spin and arrives at 0, so a positive count reads clockwise.
    const spin = c.fxSpins * 360
    const wobbleSign = c.fxSpins < 0 ? -1 : 1
    // Drift, not an absolute point: 0 leaves it where it sits rather than
    // sliding to the middle of the screen on the way out.
    const ex = c.fxExitDriftX * 50
    const ey = -c.fxExitDriftY * 50
    const exitSpin = c.fxExitSpins * 360

    const frames: Keyframe[] = []
    const push = (offset: number, x: number, y: number, deg: number, scale: number, opacity: number) =>
      frames.push({
        offset: Math.min(1, offset),
        transform: `translate(${x.toFixed(4)}vw, ${y.toFixed(4)}vh) rotate(${deg.toFixed(3)}deg) scale(${Math.max(0, scale).toFixed(5)})`,
        opacity: clamp01(opacity),
      })

    if (arriveFor > 0) {
      // A settle only reads as a settle if the image is already home when it
      // rocks. Adding a swing mid-spin just blends into the remaining rotation
      // and vanishes. So with Settle on, the whole arrival compresses into the
      // first 70% and the swing owns the last 30% — arrive, then rock.
      const settle = c.fxWobble > 0 ? 0.3 : 0
      const n = sampleCount(arriveFor)
      for (let i = 0; i <= n; i++) {
        const p = i / n // fraction of the entrance, in time
        const u = arriveEase(settle > 0 ? Math.min(1, p / (1 - settle)) : p)
        let deg = -spin * (1 - u)
        if (settle > 0) {
          // A half sine: swings past home and returns to exactly zero.
          const z = clamp01((p - (1 - settle)) / settle)
          deg += c.fxWobble * wobbleSign * Math.sin(Math.PI * z)
        }
        push(
          p * arrived,
          dx * (1 - u),
          // 4u(1-u) is a parabola: zero at both ends, peak at the middle. It
          // bends the path smoothly instead of putting a corner at a midpoint.
          dy * (1 - u) - c.fxArc * 4 * u * (1 - u),
          deg,
          c.fxStartScale + (1 - c.fxStartScale) * u,
          c.fxFade ? u : 1,
        )
      }
    } else {
      push(0, 0, 0, 0, 1, 1)
    }

    if (holdFor > 0) push(leaves, 0, 0, 0, 1, 1)

    if (leaveFor > 0) {
      const n = sampleCount(leaveFor)
      for (let i = 1; i <= n; i++) {
        const p = i / n
        const v = leaveEase(p)
        push(
          leaves + p * (1 - leaves),
          ex * v,
          ey * v - c.fxExitArc * 4 * v * (1 - v),
          exitSpin * v,
          1 + (c.fxExitScale - 1) * v,
          c.fxExitFade ? 1 - v : 1,
        )
      }
    }

    // Linear at the effect level: the shaping all lives in the sampled values,
    // so the browser's only job is to join adjacent samples. `both` holds the
    // first frame through the delay and the last frame after the end, so
    // nothing flashes into place.
    const timing: KeyframeAnimationOptions = {
      duration: total * 1000,
      delay: c.fxDelay * 1000,
      easing: 'linear',
      fill: 'both',
    }

    // Wait for the image before starting. Animating while it is still laying
    // out means its height jumps from zero to real mid-flight, which drags the
    // pivot with it — a genuine wobble, and one that only happens on the first
    // uncached visit, which is exactly the visit that matters.
    let cancelled = false
    let animation: Animation | null = null
    const begin = () => {
      if (!cancelled) animation = el.animate(frames, timing)
    }
    const img = el.querySelector('img')
    if (img && !img.complete) {
      img.addEventListener('load', begin, { once: true })
      img.addEventListener('error', begin, { once: true })
    } else {
      begin()
    }

    return () => {
      cancelled = true
      img?.removeEventListener('load', begin)
      img?.removeEventListener('error', begin)
      animation?.cancel()
    }
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
