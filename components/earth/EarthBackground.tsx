'use client'

/**
 * EarthBackground — the part you actually drop into a layout or page.
 *
 * Its job is everything that is NOT WebGL:
 *   - keep three.js out of the server bundle
 *   - show a poster image immediately, and while textures load
 *   - stop rendering when the tab is hidden or the section scrolls away
 *   - respect prefers-reduced-motion by showing the poster and nothing else
 *   - survive a machine with no working WebGL
 *
 * The poster is a plain div with a CSS background, rendered in the initial
 * HTML, so if the canvas never appears — old GPU, blocked context, texture
 * 404 — the user still sees a planet instead of a black rectangle. That is the
 * whole fallback strategy.
 *
 * It fades out as the canvas fades in rather than sitting underneath forever.
 * The canvas is transparent, and the poster is a fixed 16:9 image while the
 * scene reframes itself per viewport, so on a portrait phone the two stopped
 * agreeing: a `cover`-cropped giant Earth showing through behind a correctly
 * sized one. Two planets. Handing off between them fixes that without giving
 * up the fallback, because a failed canvas never triggers the handoff.
 */

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'

const EarthScene = dynamic(() => import('./EarthScene'), {
  ssr: false,
  loading: () => null,
})

export type EarthBackgroundProps = {
  className?: string
  posterSrc?: string
  dayMap?: string
  cloudMap?: string | null
  rotationPeriod?: number
  cloudPeriod?: number
  showStars?: boolean
  /** Dark scrim over the whole thing so foreground text stays readable. 0–1. */
  overlayOpacity?: number
}

export default function EarthBackground({
  className = '',
  posterSrc = '/textures/earth-poster.jpg',
  dayMap,
  cloudMap,
  rotationPeriod = 120,
  cloudPeriod = 90,
  showStars = true,
  overlayOpacity = 0.45,
}: EarthBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const [ready, setReady] = useState(false)

  /* --- prefers-reduced-motion ------------------------------------------ */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /* --- pause when scrolled out of view --------------------------------- */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: '100px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /* --- pause when the tab is backgrounded ------------------------------ */
  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const handleReady = useCallback(() => setReady(true), [])

  const active = onScreen && tabVisible && !reducedMotion

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black ${className}`}
    >
      {/* Server-rendered, so it paints with the first HTML rather than waiting
          on React, on three.js, or on a 600KB WebGL bundle. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${posterSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: ready ? 0 : 1,
        }}
      />

      {!reducedMotion && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <EarthScene
            dayMap={dayMap}
            cloudMap={cloudMap}
            rotationPeriod={rotationPeriod}
            cloudPeriod={cloudPeriod}
            showStars={showStars}
            active={active}
            onReady={handleReady}
          />
        </div>
      )}

      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}
    </div>
  )
}
