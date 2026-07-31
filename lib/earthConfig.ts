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
}

export const GROUPS = [
  'Motion',
  'Framing',
  'Orientation',
  'Light',
  'Atmosphere',
  'Clouds',
  'Stars',
  'Overlay',
] as const

export type Group = (typeof GROUPS)[number]

type Base = { key: keyof EarthConfig; label: string; group: Group; hint?: string }

export type ParamDef =
  | (Base & { kind: 'range'; min: number; max: number; step: number; unit?: string })
  | (Base & { kind: 'toggle' })
  | (Base & { kind: 'color' })

export const PARAMS: ParamDef[] = [
  // ---- Motion
  {
    key: 'rotationPeriod',
    label: 'Rotation period',
    group: 'Motion',
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
    group: 'Motion',
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
    group: 'Motion',
    kind: 'toggle',
    hint: 'Off is the direction Earth actually turns.',
  },

  // ---- Framing
  {
    key: 'globeSize',
    label: 'Globe size',
    group: 'Framing',
    kind: 'range',
    min: 0.25,
    max: 1.6,
    step: 0.01,
    hint: 'Fraction of the shorter screen edge the planet covers. Above 1.0 it deliberately runs off the edges.',
  },
  {
    key: 'lens',
    label: 'Lens angle',
    group: 'Framing',
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
    group: 'Framing',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
    hint: 'Slides the globe left or right so it can sit beside the text instead of behind it.',
  },
  {
    key: 'offsetY',
    label: 'Vertical position',
    group: 'Framing',
    kind: 'range',
    min: -1,
    max: 1,
    step: 0.01,
  },

  // ---- Orientation
  {
    key: 'tilt',
    label: 'Axial tilt',
    group: 'Orientation',
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
    group: 'Orientation',
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
    group: 'Orientation',
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
    group: 'Light',
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
    group: 'Light',
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
    group: 'Light',
    kind: 'range',
    min: 0,
    max: 5,
    step: 0.05,
  },
  {
    key: 'nightFill',
    label: 'Night fill',
    group: 'Light',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'How visible the dark half is. At 0 the night side is a black void.',
  },

  // ---- Atmosphere
  { key: 'atmosphereColor', label: 'Glow colour', group: 'Atmosphere', kind: 'color' },
  {
    key: 'atmosphereReach',
    label: 'Glow reach',
    group: 'Atmosphere',
    kind: 'range',
    min: 1,
    max: 1.4,
    step: 0.005,
    hint: 'How far past the surface the glow extends. Push this high and it stops looking like air and starts looking like a hoop.',
  },
  {
    key: 'atmosphereTightness',
    label: 'Glow tightness',
    group: 'Atmosphere',
    kind: 'range',
    min: 0.5,
    max: 8,
    step: 0.1,
    hint: 'High is a thin crisp rim, low is a broad haze.',
  },
  {
    key: 'atmosphereBrightness',
    label: 'Glow brightness',
    group: 'Atmosphere',
    kind: 'range',
    min: 0,
    max: 3,
    step: 0.05,
  },

  // ---- Clouds
  { key: 'cloudsEnabled', label: 'Clouds', group: 'Clouds', kind: 'toggle' },
  {
    key: 'cloudOpacity',
    label: 'Cloud opacity',
    group: 'Clouds',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'Wispy at low values, solid overcast at high ones.',
  },
  {
    key: 'cloudAltitude',
    label: 'Cloud altitude',
    group: 'Clouds',
    kind: 'range',
    min: 1,
    max: 1.06,
    step: 0.001,
    hint: 'How far above the surface they float. Higher makes them stand off the edge of the planet.',
  },

  // ---- Stars
  { key: 'starsEnabled', label: 'Stars', group: 'Stars', kind: 'toggle' },
  { key: 'starCount', label: 'Star count', group: 'Stars', kind: 'range', min: 0, max: 8000, step: 100 },
  { key: 'starSize', label: 'Star size', group: 'Stars', kind: 'range', min: 0.5, max: 10, step: 0.1 },

  // ---- Overlay
  {
    key: 'scrimOpacity',
    label: 'Scrim darkness',
    group: 'Overlay',
    kind: 'range',
    min: 0,
    max: 0.9,
    step: 0.01,
    hint: 'The wash over everything that keeps the headline readable. Judge it against the text, not the planet.',
  },
  { key: 'scrimColor', label: 'Scrim colour', group: 'Overlay', kind: 'color' },
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
