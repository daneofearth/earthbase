/**
 * Every knob on the globe, in one place.
 *
 * This file is the single source of truth for three things that otherwise drift
 * apart: the shape of a saved config file, the defaults, and the controls in
 * the tuner. Adding a parameter is one entry in PARAMS plus one line in
 * DEFAULTS — the slider appears on its own, and old saved files keep working
 * because unknown keys fall back to the default.
 */

export type EarthConfig = {
  // Motion
  rotationPeriod: number
  cloudSpeedRatio: number
  reverse: boolean

  // Framing
  globeSize: number
  lens: number
  offsetX: number
  offsetY: number

  // Orientation
  tilt: number
  nod: number
  startLongitude: number

  // Light
  sunAzimuth: number
  sunElevation: number
  sunIntensity: number
  nightFill: number

  // Atmosphere
  atmosphereColor: string
  atmosphereReach: number
  atmosphereTightness: number
  atmosphereBrightness: number

  // Clouds
  cloudsEnabled: boolean
  cloudOpacity: number
  cloudAltitude: number

  // Stars
  starsEnabled: boolean
  starCount: number
  starSize: number

  // Overlay
  scrimOpacity: number
  scrimColor: string

  // Text — layout of the block as a whole
  textAlign: string
  textOffsetX: number
  textOffsetY: number
  textMaxWidth: number

  // Text — title
  titleShow: boolean
  titleText: string
  titleSize: number
  titleWeight: number
  titleColor: string
  titleTracking: number

  // Text — subtitle
  subtitleShow: boolean
  subtitleText: string
  subtitleSize: number
  subtitleWeight: number
  subtitleColor: string
  subtitleGap: number

  // Text — description
  descriptionShow: boolean
  descriptionText: string
  descriptionSize: number
  descriptionWeight: number
  descriptionColor: string
  descriptionGap: number
  descriptionLineHeight: number
}

export const DEFAULTS: EarthConfig = {
  rotationPeriod: 140,
  cloudSpeedRatio: 1.55,
  reverse: false,

  globeSize: 0.71,
  lens: 42,
  offsetX: 0,
  offsetY: 0,

  tilt: 23.4,
  nod: 0,
  startLongitude: 0,

  sunAzimuth: 51,
  sunElevation: 17,
  sunIntensity: 2.4,
  nightFill: 0.08,

  atmosphereColor: '#4a9eff',
  atmosphereReach: 1.05,
  atmosphereTightness: 2.2,
  atmosphereBrightness: 1.15,

  cloudsEnabled: true,
  cloudOpacity: 0.75,
  cloudAltitude: 1.012,

  starsEnabled: true,
  starCount: 2500,
  starSize: 3,

  scrimOpacity: 0.5,
  scrimColor: '#000000',

  textAlign: 'center',
  textOffsetX: 0,
  textOffsetY: 0,
  textMaxWidth: 60,

  titleShow: true,
  titleText: 'Dane of Earth',
  titleSize: 4.5,
  titleWeight: 600,
  titleColor: '#ffffff',
  titleTracking: -0.025,

  subtitleShow: true,
  subtitleText: 'Something is being built here.',
  subtitleSize: 1.125,
  subtitleWeight: 400,
  subtitleColor: '#b3b3b3',
  subtitleGap: 1.5,

  descriptionShow: true,
  descriptionText: 'daneofearth.org',
  descriptionSize: 0.875,
  descriptionWeight: 400,
  descriptionColor: '#808080',
  descriptionGap: 2.5,
  descriptionLineHeight: 1.6,
}

export const TABS = ['Earth', 'Text', 'Effects'] as const
export type Tab = (typeof TABS)[number]

/** Which groups appear under each tab, in order. */
export const GROUPS: Record<Tab, readonly string[]> = {
  Earth: ['Motion', 'Framing', 'Orientation', 'Light', 'Atmosphere', 'Clouds', 'Stars', 'Overlay'],
  Text: ['Layout', 'Title', 'Subtitle', 'Description'],
  Effects: [],
}

type Base = { key: keyof EarthConfig; label: string; tab: Tab; group: string; hint?: string }

export type ParamDef =
  | (Base & { kind: 'range'; min: number; max: number; step: number; unit?: string })
  | (Base & { kind: 'toggle' })
  | (Base & { kind: 'color' })
  | (Base & { kind: 'text'; maxLength: number; multiline?: boolean; placeholder?: string })
  | (Base & { kind: 'select'; options: readonly string[] })

export const PARAMS: ParamDef[] = [
  // ---- Motion
  {
    key: 'rotationPeriod',
    label: 'Rotation period',
    tab: 'Earth', group: 'Motion',
    kind: 'range',
    min: 20,
    max: 600,
    step: 5,
    unit: 's',
    hint: 'Seconds for one full turn. Lower is faster. Below about 60 it starts to feel like a screensaver.',
  },
  {
    key: 'cloudSpeedRatio',
    label: 'Cloud speed',
    tab: 'Earth', group: 'Motion',
    kind: 'range',
    min: 0,
    max: 3,
    step: 0.05,
    unit: '×',
    hint: 'How fast the clouds turn compared to the surface. This is the parallax. 1.0 means they move together and the effect disappears.',
  },
  {
    key: 'reverse',
    label: 'Reverse spin',
    tab: 'Earth', group: 'Motion',
    kind: 'toggle',
    hint: 'Off is the direction Earth actually turns.',
  },

  // ---- Framing
  {
    key: 'globeSize',
    label: 'Globe size',
    tab: 'Earth', group: 'Framing',
    kind: 'range',
    min: 0.25,
    max: 1.6,
    step: 0.01,
    hint: 'Fraction of the shorter screen edge the planet covers. Above 1.0 it deliberately runs off the edges.',
  },
  {
    key: 'lens',
    label: 'Lens angle',
    tab: 'Earth', group: 'Framing',
    kind: 'range',
    min: 15,
    max: 90,
    step: 1,
    unit: '°',
    hint: 'Perspective only, not size — the globe stays the same size. Low is telescope-flat, high bulges it toward you.',
  },
  {
    key: 'offsetX',
    label: 'Horizontal position',
    tab: 'Earth', group: 'Framing',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
    hint: 'Slides the globe left or right so it can sit beside the text instead of behind it.',
  },
  {
    key: 'offsetY',
    label: 'Vertical position',
    tab: 'Earth', group: 'Framing',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
  },

  // ---- Orientation
  {
    key: 'tilt',
    label: 'Axial tilt',
    tab: 'Earth', group: 'Orientation',
    kind: 'range',
    min: -45,
    max: 45,
    step: 0.1,
    unit: '°',
    hint: '23.4° is the real one. Leans the pole left or right.',
  },
  {
    key: 'nod',
    label: 'Nod',
    tab: 'Earth', group: 'Orientation',
    kind: 'range',
    min: -60,
    max: 60,
    step: 0.5,
    unit: '°',
    hint: 'Tips the north pole toward or away from you, so you look down on the planet a little.',
  },
  {
    key: 'startLongitude',
    label: 'Starting longitude',
    tab: 'Earth', group: 'Orientation',
    kind: 'range',
    min: -180,
    max: 180,
    step: 1,
    unit: '°',
    hint: 'Which part of Earth faces front when the page loads. 0 is the Americas.',
  },

  // ---- Light
  {
    key: 'sunAzimuth',
    label: 'Sun direction',
    tab: 'Earth', group: 'Light',
    kind: 'range',
    min: 0,
    max: 360,
    step: 1,
    unit: '°',
    hint: 'Swings the sun around the planet — moves the day/night line left and right.',
  },
  {
    key: 'sunElevation',
    label: 'Sun height',
    tab: 'Earth', group: 'Light',
    kind: 'range',
    min: -90,
    max: 90,
    step: 1,
    unit: '°',
    hint: 'Raises or lowers the sun. Near zero lights the equator; high values light the top of the globe.',
  },
  {
    key: 'sunIntensity',
    label: 'Sun brightness',
    tab: 'Earth', group: 'Light',
    kind: 'range',
    min: 0,
    max: 5,
    step: 0.05,
  },
  {
    key: 'nightFill',
    label: 'Night fill',
    tab: 'Earth', group: 'Light',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'How visible the dark half is. At 0 the night side is a black void.',
  },

  // ---- Atmosphere
  { key: 'atmosphereColor', label: 'Glow colour', tab: 'Earth', group: 'Atmosphere', kind: 'color' },
  {
    key: 'atmosphereReach',
    label: 'Glow reach',
    tab: 'Earth', group: 'Atmosphere',
    kind: 'range',
    min: 1,
    max: 1.4,
    step: 0.005,
    hint: 'How far past the surface the glow extends. Push this high and it stops looking like air and starts looking like a hoop.',
  },
  {
    key: 'atmosphereTightness',
    label: 'Glow tightness',
    tab: 'Earth', group: 'Atmosphere',
    kind: 'range',
    min: 0.5,
    max: 8,
    step: 0.1,
    hint: 'High is a thin crisp rim, low is a broad haze.',
  },
  {
    key: 'atmosphereBrightness',
    label: 'Glow brightness',
    tab: 'Earth', group: 'Atmosphere',
    kind: 'range',
    min: 0,
    max: 3,
    step: 0.05,
  },

  // ---- Clouds
  { key: 'cloudsEnabled', label: 'Clouds', tab: 'Earth', group: 'Clouds', kind: 'toggle' },
  {
    key: 'cloudOpacity',
    label: 'Cloud opacity',
    tab: 'Earth', group: 'Clouds',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'Wispy at low values, solid overcast at high ones.',
  },
  {
    key: 'cloudAltitude',
    label: 'Cloud altitude',
    tab: 'Earth', group: 'Clouds',
    kind: 'range',
    min: 1,
    max: 1.06,
    step: 0.001,
    hint: 'How far above the surface they float. Higher makes them stand off the edge of the planet.',
  },

  // ---- Stars
  { key: 'starsEnabled', label: 'Stars', tab: 'Earth', group: 'Stars', kind: 'toggle' },
  { key: 'starCount', label: 'Star count', tab: 'Earth', group: 'Stars', kind: 'range', min: 0, max: 8000, step: 100 },
  { key: 'starSize', label: 'Star size', tab: 'Earth', group: 'Stars', kind: 'range', min: 0.5, max: 10, step: 0.1 },

  // ---- Overlay
  {
    key: 'scrimOpacity',
    label: 'Scrim darkness',
    tab: 'Earth', group: 'Overlay',
    kind: 'range',
    min: 0,
    max: 0.9,
    step: 0.01,
    hint: 'The wash over everything that keeps the headline readable. Judge it against the text, not the planet.',
  },
  { key: 'scrimColor', label: 'Scrim colour', tab: 'Earth', group: 'Overlay', kind: 'color' },

  /* ===================================================================== Text
   *
   * Sizes are in rem and rendered through a min() against a vw value, so one
   * number covers every screen: a 4.5rem headline stays 4.5rem on a desktop and
   * shrinks itself on a phone. Without that, any size big enough to look right
   * on a laptop overflows a 390px screen.
   */

  // ---- Layout
  {
    key: 'textAlign',
    label: 'Alignment',
    tab: 'Text',
    group: 'Layout',
    kind: 'select',
    options: ['left', 'center', 'right'],
  },
  {
    key: 'textOffsetX',
    label: 'Horizontal position',
    tab: 'Text',
    group: 'Layout',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
    hint: 'Moves the whole block. Pair it with the globe position to sit the text beside the planet rather than on top of it.',
  },
  {
    key: 'textOffsetY',
    label: 'Vertical position',
    tab: 'Text',
    group: 'Layout',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
  },
  {
    key: 'textMaxWidth',
    label: 'Block width',
    tab: 'Text',
    group: 'Layout',
    kind: 'range',
    min: 20,
    max: 100,
    step: 1,
    unit: '%',
    hint: 'How wide the text may run before wrapping, as a share of the screen. Narrower reads better for long lines.',
  },

  // ---- Title
  { key: 'titleShow', label: 'Show title', tab: 'Text', group: 'Title', kind: 'toggle' },
  {
    key: 'titleText',
    label: 'Title',
    tab: 'Text',
    group: 'Title',
    kind: 'text',
    maxLength: 120,
    placeholder: 'Dane of Earth',
  },
  {
    key: 'titleSize',
    label: 'Size',
    tab: 'Text',
    group: 'Title',
    kind: 'range',
    min: 1,
    max: 10,
    step: 0.05,
    unit: 'rem',
  },
  {
    key: 'titleWeight',
    label: 'Weight',
    tab: 'Text',
    group: 'Title',
    kind: 'range',
    min: 100,
    max: 900,
    step: 100,
  },
  { key: 'titleColor', label: 'Colour', tab: 'Text', group: 'Title', kind: 'color' },
  {
    key: 'titleTracking',
    label: 'Letter spacing',
    tab: 'Text',
    group: 'Title',
    kind: 'range',
    min: -0.08,
    max: 0.3,
    step: 0.005,
    unit: 'em',
    hint: 'Large headlines usually want slightly negative spacing; small caps-y text wants positive.',
  },

  // ---- Subtitle
  { key: 'subtitleShow', label: 'Show subtitle', tab: 'Text', group: 'Subtitle', kind: 'toggle' },
  {
    key: 'subtitleText',
    label: 'Subtitle',
    tab: 'Text',
    group: 'Subtitle',
    kind: 'text',
    maxLength: 300,
    multiline: true,
    placeholder: 'Something is being built here.',
  },
  {
    key: 'subtitleSize',
    label: 'Size',
    tab: 'Text',
    group: 'Subtitle',
    kind: 'range',
    min: 0.6,
    max: 4,
    step: 0.025,
    unit: 'rem',
  },
  {
    key: 'subtitleWeight',
    label: 'Weight',
    tab: 'Text',
    group: 'Subtitle',
    kind: 'range',
    min: 100,
    max: 900,
    step: 100,
  },
  { key: 'subtitleColor', label: 'Colour', tab: 'Text', group: 'Subtitle', kind: 'color' },
  {
    key: 'subtitleGap',
    label: 'Space above',
    tab: 'Text',
    group: 'Subtitle',
    kind: 'range',
    min: 0,
    max: 8,
    step: 0.1,
    unit: 'rem',
  },

  // ---- Description
  {
    key: 'descriptionShow',
    label: 'Show description',
    tab: 'Text',
    group: 'Description',
    kind: 'toggle',
  },
  {
    key: 'descriptionText',
    label: 'Description',
    tab: 'Text',
    group: 'Description',
    kind: 'text',
    maxLength: 1000,
    multiline: true,
    placeholder: 'daneofearth.org',
  },
  {
    key: 'descriptionSize',
    label: 'Size',
    tab: 'Text',
    group: 'Description',
    kind: 'range',
    min: 0.6,
    max: 3,
    step: 0.025,
    unit: 'rem',
  },
  {
    key: 'descriptionWeight',
    label: 'Weight',
    tab: 'Text',
    group: 'Description',
    kind: 'range',
    min: 100,
    max: 900,
    step: 100,
  },
  { key: 'descriptionColor', label: 'Colour', tab: 'Text', group: 'Description', kind: 'color' },
  {
    key: 'descriptionGap',
    label: 'Space above',
    tab: 'Text',
    group: 'Description',
    kind: 'range',
    min: 0,
    max: 8,
    step: 0.1,
    unit: 'rem',
  },
  {
    key: 'descriptionLineHeight',
    label: 'Line height',
    tab: 'Text',
    group: 'Description',
    kind: 'range',
    min: 1,
    max: 2.4,
    step: 0.05,
    hint: 'Only shows up once the text wraps to more than one line.',
  },
]

const PARAM_BY_KEY = new Map(PARAMS.map((p) => [p.key, p]))

/**
 * Merges saved values over the defaults, dropping anything unrecognised and
 * clamping numbers into range.
 *
 * Saved files are hand-editable text and outlive the code that wrote them, so
 * they are treated as untrusted input: a preset saved before a parameter
 * existed, or edited by hand into nonsense, must not be able to produce a
 * broken globe on the live site.
 */
export function resolveConfig(saved: unknown): EarthConfig {
  const out = { ...DEFAULTS }
  if (!saved || typeof saved !== 'object') return out

  for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
    const def = PARAM_BY_KEY.get(key as keyof EarthConfig)
    if (!def) continue

    if (def.kind === 'range' && typeof value === 'number' && Number.isFinite(value)) {
      ;(out[def.key] as number) = Math.min(def.max, Math.max(def.min, value))
    } else if (def.kind === 'toggle' && typeof value === 'boolean') {
      ;(out[def.key] as boolean) = value
    } else if (def.kind === 'color' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      ;(out[def.key] as string) = value
    } else if (def.kind === 'text' && typeof value === 'string') {
      // Truncated rather than rejected: a too-long string is someone pasting an
      // essay, not an attack, and silently dropping their text would be worse.
      // It is rendered as text content, never as HTML, so there is nothing to
      // escape here.
      ;(out[def.key] as string) = value.slice(0, def.maxLength)
    } else if (def.kind === 'select' && typeof value === 'string' && def.options.includes(value)) {
      ;(out[def.key] as string) = value
    }
  }
  return out
}

/** Turns a preset name into a filename-safe slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
