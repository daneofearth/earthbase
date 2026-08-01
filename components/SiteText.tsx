import type { CSSProperties } from 'react'
import { resolveConfig, type EarthConfig } from '@/lib/earthConfig'

/**
 * The headline block, rendered from config.
 *
 * The live page and the tuner's preview both use this, so what you drag the
 * sliders against is the real thing rather than a mock-up that can drift away
 * from it.
 *
 * Sizes arrive in rem but are rendered through `min()` against a vw value. One
 * number then covers every screen: a 4.5rem headline stays 4.5rem on a desktop
 * and scales itself down on a phone. Without that, any size that looks right on
 * a laptop overflows a 390px screen — which is exactly what the old hardcoded
 * `text-5xl sm:text-7xl` was there to prevent.
 */

/** rem, but never wider than the screen can take. */
function responsive(rem: number): string {
  return `min(${rem}rem, ${(rem * 2.6).toFixed(2)}vw)`
}

export default function SiteText({ config }: { config: Partial<EarthConfig> }) {
  const c = resolveConfig(config)

  const align = c.textAlign as CSSProperties['textAlign']

  const block: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    // Two translates rather than one: the first centres the block on its own
    // size, the second moves it by a share of the viewport. Combining them into
    // one percentage would make the offset depend on how long the text is.
    transform: `translate(-50%, -50%) translate(${c.textOffsetX * 50}vw, ${-c.textOffsetY * 50}vh)`,
    // A percentage alone is a desktop measurement: 60% of a 390px phone is
    // 234px, narrow enough to break a short headline across two lines. The
    // floor keeps it readable on small screens; the ceiling keeps it on screen.
    width: `min(100%, max(${c.textMaxWidth}%, 20rem))`,
    textAlign: align,
    // The globe sits behind; nothing here should swallow clicks meant for it.
    pointerEvents: 'none',
  }

  return (
    <div style={block} className="px-4">
      {c.titleShow && c.titleText && (
        <h1
          style={{
            fontSize: responsive(c.titleSize),
            fontWeight: c.titleWeight,
            color: c.titleColor,
            letterSpacing: `${c.titleTracking}em`,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {c.titleText}
        </h1>
      )}

      {c.subtitleShow && c.subtitleText && (
        <p
          style={{
            fontSize: responsive(c.subtitleSize),
            fontWeight: c.subtitleWeight,
            color: c.subtitleColor,
            marginTop: `${c.subtitleGap}rem`,
            marginBottom: 0,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {c.subtitleText}
        </p>
      )}

      {c.descriptionShow && c.descriptionText && (
        <p
          style={{
            fontSize: responsive(c.descriptionSize),
            fontWeight: c.descriptionWeight,
            color: c.descriptionColor,
            marginTop: `${c.descriptionGap}rem`,
            marginBottom: 0,
            lineHeight: c.descriptionLineHeight,
            whiteSpace: 'pre-wrap',
          }}
        >
          {c.descriptionText}
        </p>
      )}
    </div>
  )
}
