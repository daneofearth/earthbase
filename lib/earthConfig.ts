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
  startLatitude: number
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

  // Image — the element itself, and where it comes to rest
  imageShow: boolean
  imageSrc: string
  imageAlt: string
  imageWidth: number
  imageX: number
  imageY: number
  imageOpacity: number
  imageFlip: boolean
  imageGlow: number

  // Entrance — a one-shot arrival, not a loop
  fxEnabled: boolean
  fxDuration: number
  fxDelay: number
  fxSpins: number
  fxStartScale: number
  fxStartX: number
  fxStartY: number
  fxLanding: string
  fxFade: boolean
  fxPivot: string
  fxArc: number
  fxWobble: number

  // Exit — how it leaves, after holding
  fxExitEnabled: boolean
  fxHold: number
  fxExitDuration: number
  fxExitFade: boolean
  fxExitScale: number
  fxExitSpins: number
  fxExitDriftX: number
  fxExitDriftY: number
  fxExitLeaving: string
  fxExitArc: number
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
  // Dane's spot in the Oregon Cascades foothills. The full precision is
  // meaningless at planet scale but costs nothing to keep.
  startLatitude: 44.360277,
  startLongitude: -122.855294,

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

  imageShow: true,
  imageSrc: '',
  imageAlt: '',
  imageWidth: 26,
  imageX: -0.55,
  // Negative is down: the lower-left corner, where the half-body shot goes.
  imageY: -0.45,
  imageOpacity: 1,
  imageFlip: false,
  imageGlow: 0,

  fxEnabled: true,
  fxDuration: 1.4,
  fxDelay: 0.4,
  fxSpins: 3,
  fxStartScale: 0,
  fxStartX: 0,
  fxStartY: 0,
  // Linear by default: an even rate is predictable and never looks like it
  // hesitates. The eased options are there when a softer stop is wanted.
  fxLanding: 'linear',
  fxFade: true,
  fxPivot: 'center',
  fxArc: 0,
  fxWobble: 0,

  // Off by default. Anything already saved and live would otherwise start
  // making its image disappear the moment this shipped.
  fxExitEnabled: false,
  fxHold: 4,
  fxExitDuration: 1.2,
  fxExitFade: true,
  fxExitScale: 1,
  fxExitSpins: 0,
  fxExitDriftX: 0,
  fxExitDriftY: 0,
  fxExitLeaving: 'glide',
  fxExitArc: 0,
}

export const TABS = ['Earth', 'Text', 'Effects'] as const
export type Tab = (typeof TABS)[number]

/** Which groups appear under each tab, in order. */
export const GROUPS: Record<Tab, readonly string[]> = {
  Earth: ['Motion', 'Framing', 'Orientation', 'Light', 'Atmosphere', 'Clouds', 'Stars', 'Overlay'],
  Text: ['Layout', 'Title', 'Subtitle', 'Description'],
  Effects: ['Image', 'Entrance', 'Exit'],
}

type Base = { key: keyof EarthConfig; label: string; tab: Tab; group: string; hint?: string }

export type ParamDef =
  | (Base & { kind: 'range'; min: number; max: number; step: number; unit?: string })
  | (Base & { kind: 'toggle' })
  | (Base & { kind: 'color' })
  | (Base & { kind: 'text'; maxLength: number; multiline?: boolean; placeholder?: string })
  | (Base & { kind: 'select'; options: readonly string[] })
  /** A URL plus an upload button that fills it in. */
  | (Base & { kind: 'image'; maxLength: number; placeholder?: string })

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
    key: 'startLatitude',
    label: 'Facing latitude',
    tab: 'Earth', group: 'Orientation',
    kind: 'range',
    min: -80,
    max: 80,
    step: 0.1,
    unit: '°',
    hint: 'The real latitude at the centre of the globe. Positive is north — raising it looks down on the planet. A big axial tilt puts the most extreme latitudes out of reach.',
  },
  {
    key: 'startLongitude',
    label: 'Facing longitude',
    tab: 'Earth', group: 'Orientation',
    kind: 'range',
    min: -180,
    max: 180,
    step: 0.1,
    unit: '°',
    hint: 'The real longitude at the centre when the page loads — the spin carries on from there. Negative is west.',
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

  /* ================================================================== Effects
   *
   * Normie's effects are all infinite loops at constant speed — ambient motion.
   * This is the other kind: a one-shot arrival that lands and stops. Entrances
   * need controls loops do not, and nearly all of them are about how it lands.
   *
   * The Image values are where the picture *lives*. The Entrance values only
   * describe how it gets there. If the animation never runs — reduced motion,
   * an old browser, a script that failed — the picture is still exactly where
   * it belongs, at the right size.
   */

  // ---- Image
  { key: 'imageShow', label: 'Show image', tab: 'Effects', group: 'Image', kind: 'toggle' },
  {
    key: 'imageSrc',
    label: 'Image',
    tab: 'Effects',
    group: 'Image',
    kind: 'image',
    maxLength: 500,
    placeholder: 'Paste a URL, or upload',
    hint: 'A cut-out PNG with a transparent background sits best over the globe.',
  },
  {
    key: 'imageAlt',
    label: 'Description for screen readers',
    tab: 'Effects',
    group: 'Image',
    kind: 'text',
    maxLength: 200,
    placeholder: 'Dane, waist up',
    hint: 'Leave empty if the image is purely decorative — that tells a screen reader to skip it rather than read out a filename.',
  },
  {
    key: 'imageWidth',
    label: 'Width',
    tab: 'Effects',
    group: 'Image',
    kind: 'range',
    min: 4,
    max: 90,
    step: 0.5,
    unit: '%',
    hint: 'Share of the screen width, so it holds its proportions on a phone.',
  },
  {
    key: 'imageX',
    label: 'Horizontal position',
    tab: 'Effects',
    group: 'Image',
    kind: 'range',
    min: -1.2,
    max: 1.2,
    step: 0.01,
  },
  {
    key: 'imageY',
    label: 'Vertical position',
    tab: 'Effects',
    group: 'Image',
    kind: 'range',
    min: -1.2,
    max: 1.2,
    step: 0.01,
    hint: 'Negative is down. Past 1 the image hangs off the edge, which is how you crop a half-body shot at the bottom.',
  },
  {
    key: 'imageOpacity',
    label: 'Opacity',
    tab: 'Effects',
    group: 'Image',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.01,
  },
  { key: 'imageFlip', label: 'Flip horizontally', tab: 'Effects', group: 'Image', kind: 'toggle' },
  {
    key: 'imageGlow',
    label: 'Glow',
    tab: 'Effects',
    group: 'Image',
    kind: 'range',
    min: 0,
    max: 60,
    step: 1,
    unit: 'px',
    hint: 'A soft halo. A cut-out on black usually needs a little or it looks pasted on.',
  },

  // ---- Entrance
  {
    key: 'fxEnabled',
    label: 'Spin in on load',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'toggle',
    hint: 'Off leaves the image simply present. Visitors who ask for reduced motion always get that version.',
  },
  {
    key: 'fxDuration',
    label: 'Duration',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: 0.2,
    max: 6,
    step: 0.05,
    unit: 's',
  },
  {
    key: 'fxDelay',
    label: 'Delay',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: 0,
    max: 5,
    step: 0.05,
    unit: 's',
    hint: 'Wait before it starts. This is what lets the image arrive after the globe has faded in, instead of everything happening at once.',
  },
  {
    key: 'fxSpins',
    label: 'Rotations',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: -8,
    max: 8,
    step: 0.25,
    hint: 'Full turns on the way in. Negative spins the other way.',
  },
  {
    key: 'fxStartScale',
    label: 'Starting size',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: 0,
    max: 2,
    step: 0.01,
    unit: '×',
    hint: 'As a multiple of the final size. 0 grows it out of nothing; above 1 shrinks it into place.',
  },
  {
    key: 'fxStartX',
    label: 'Starting horizontal',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: -2,
    max: 2,
    step: 0.01,
    hint: 'Where it comes from, in the same scale as the image position. Beyond ±1 it starts off screen.',
  },
  {
    key: 'fxStartY',
    label: 'Starting vertical',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: -2,
    max: 2,
    step: 0.01,
  },
  {
    key: 'fxLanding',
    label: 'Landing',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'select',
    options: ['linear', 'glide', 'overshoot'],
    hint: 'Applies to growing, travelling and turning together — they always finish at the same instant. Linear is an even rate throughout. Glide slows toward the end. Overshoot goes slightly past and settles back.',
  },
  {
    key: 'fxFade',
    label: 'Fade in',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'toggle',
    hint: 'Something growing from nothing looks like a glitch without this.',
  },
  {
    key: 'fxPivot',
    label: 'Spins around its',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'select',
    options: ['center', 'bottom', 'top', 'left', 'right'],
    hint: 'Same numbers, completely different effect: turning about the feet reads as a cartwheel, about the middle as a pinwheel.',
  },
  {
    key: 'fxArc',
    label: 'Arc',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: 0,
    max: 50,
    step: 1,
    hint: 'Lifts the midpoint of the path so it curves in rather than running along a rail. 0 is a straight line.',
  },
  {
    key: 'fxWobble',
    label: 'Settle',
    tab: 'Effects',
    group: 'Entrance',
    kind: 'range',
    min: 0,
    max: 30,
    step: 1,
    unit: '°',
    hint: 'A small over-rotation near the end that rocks back, as though it overshot and corrected.',
  },

  /* ---- Exit
   *
   * Nearly a mirror of Entrance, with three deliberate differences.
   *
   * Position is a *drift* from where the image rests, not an absolute point, so
   * 0 means "stays put" — otherwise a plain fade-out would slide to the middle
   * of the screen on its way, which is never what anyone wants.
   *
   * The curves are inverted. An entrance decelerates into place; an exit
   * accelerates away. Reusing the entrance curves would make the image crawl
   * out, which reads as hesitation rather than departure.
   *
   * There is no settle, because nothing settles on the way out, and the pivot
   * is shared with Entrance — changing it mid-flight would visibly jump.
   */
  {
    key: 'fxExitEnabled',
    label: 'Leave after a while',
    tab: 'Effects',
    group: 'Exit',
    kind: 'toggle',
    hint: 'Off leaves the image on screen for good. Visitors who ask for reduced motion always get that version.',
  },
  {
    key: 'fxHold',
    label: 'Hold before leaving',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: 0,
    max: 30,
    step: 0.1,
    unit: 's',
    hint: 'Time it stays put after arriving. Measured from the end of the entrance, so changing the entrance does not shift it.',
  },
  {
    key: 'fxExitDuration',
    label: 'Duration',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: 0.2,
    max: 6,
    step: 0.05,
    unit: 's',
  },
  {
    key: 'fxExitFade',
    label: 'Fade out',
    tab: 'Effects',
    group: 'Exit',
    kind: 'toggle',
    hint: 'On its own — no spin, no drift, ending size 1 — this is a plain fade out.',
  },
  {
    key: 'fxExitScale',
    label: 'Ending size',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: 0,
    max: 2,
    step: 0.01,
    unit: '×',
    hint: 'A multiple of its normal size. 1 keeps it the same on the way out; 0 shrinks it to nothing.',
  },
  {
    key: 'fxExitSpins',
    label: 'Rotations',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: -8,
    max: 8,
    step: 0.25,
    hint: 'Full turns on the way out. Negative spins the other way.',
  },
  {
    key: 'fxExitDriftX',
    label: 'Horizontal drift',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: -2,
    max: 2,
    step: 0.01,
    hint: 'How far it travels as it leaves, from wherever it was sitting. 0 stays in place.',
  },
  {
    key: 'fxExitDriftY',
    label: 'Vertical drift',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: -2,
    max: 2,
    step: 0.01,
  },
  {
    key: 'fxExitLeaving',
    label: 'Leaving',
    tab: 'Effects',
    group: 'Exit',
    kind: 'select',
    options: ['linear', 'glide', 'anticipate'],
    hint: 'Glide starts slowly and accelerates away. Anticipate pulls back a little first, like a wind-up.',
  },
  {
    key: 'fxExitArc',
    label: 'Arc',
    tab: 'Effects',
    group: 'Exit',
    kind: 'range',
    min: -50,
    max: 50,
    step: 1,
    hint: 'Bends the departure path. Positive lifts it, negative dips it.',
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
    } else if ((def.kind === 'text' || def.kind === 'image') && typeof value === 'string') {
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
