# Rotating Earth Background — Setup

Two components, three texture files, one install command.

```
components/earth/EarthBackground.tsx   ← import this
components/earth/EarthScene.tsx        ← never imported directly
public/textures/earth-day.jpg
public/textures/earth-clouds.jpg
public/textures/earth-poster.jpg
```

---

## 1. Install

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

**Version gotcha, and it will bite you.** `@react-three/fiber` v9 requires React 19.
v8 requires React 18. They are not interchangeable, and the error you get when
they mismatch is an unhelpful reconciler crash, not a clear message.

```bash
# React 19 (Next 15+)
npm install three @react-three/fiber@^9 @react-three/drei@^10

# React 18 (Next 14)
npm install three @react-three/fiber@^8 @react-three/drei@^9
```

Check with `npm ls react`.

---

## 2. Get the textures

Two public-domain sources, both fine to use commercially:

| File | Source |
|---|---|
| Day map | NASA Blue Marble Next Generation — `visibleearth.nasa.gov`, search "Blue Marble Next Generation Topography and Bathymetry". Pick **August** (least snow cover). |
| Cloud map | `solarsystemscope.com/textures` → `8k_earth_clouds.jpg`. Grayscale, works as an alpha mask as-is. |

NASA's original is 21600×10800 and about half a gigabyte. You need a fraction
of that.

### Resize (ImageMagick)

```bash
# Day map — 4096 wide is the sweet spot for a background globe
magick world.topo.bathy.200408.3x21600x10800.jpg \
  -resize 4096x2048! -quality 85 public/textures/earth-day.jpg

# Clouds — half resolution is invisible on a mask
magick 8k_earth_clouds.jpg \
  -resize 2048x1024! -quality 82 public/textures/earth-clouds.jpg
```

The `!` forces exact dimensions and ignores aspect ratio. That is intentional —
equirectangular maps must stay exactly 2:1 or the geography stretches.

### The poster

Screenshot the running component once it looks right, or render a still frame
from Blender. 1920×1080, quality 70, under 120KB. It is behind a dark scrim,
so it does not need to be sharp.

### About texture size and VRAM

This is the number people miss. A 4096×2048 texture on the GPU is not the
JPEG's 1.5MB — it is decompressed to raw pixels: 4096 × 2048 × 4 bytes ≈ **33MB**,
plus another third for mipmaps. Two of those is roughly 90MB of VRAM. Desktops
shrug. A five-year-old phone may not.

If you support older mobile, ship a 2048 day map to small viewports:

```tsx
const [dayMap, setDayMap] = useState('/textures/earth-day-2k.jpg')
useEffect(() => {
  if (window.innerWidth > 900) setDayMap('/textures/earth-day.jpg')
}, [])
```

---

## 3. Use it

```tsx
// app/page.tsx
import EarthBackground from '@/components/earth/EarthBackground'

export default function Home() {
  return (
    <section className="relative flex min-h-screen items-center justify-center">
      <EarthBackground rotationPeriod={140} overlayOpacity={0.5} />

      <div className="relative z-10 text-center text-white">
        <h1 className="text-6xl font-semibold">Dane of Earth</h1>
      </div>
    </section>
  )
}
```

Three CSS requirements, all easy to get wrong:

1. The parent needs `position: relative` (Tailwind `relative`). The background
   is `absolute inset-0`; without a positioned ancestor it escapes to the body.
2. Foreground content needs `relative z-10` or it renders *behind* the globe.
3. `EarthBackground` is already `pointer-events-none`, so it will not eat clicks.

For a background that persists across the whole site, change `absolute` to
`fixed` in `EarthBackground.tsx` and mount it once in `app/layout.tsx`.

---

## 4. Tuning

| Prop | Default | Notes |
|---|---|---|
| `rotationPeriod` | `120` | Seconds per full turn. Higher = slower. Under 60 starts to feel like a screensaver. |
| `cloudPeriod` | `90` | Faster than the Earth, which creates parallax. Any value works — nothing has to line up, because nothing loops. |
| `overlayOpacity` | `0.45` | Dark scrim for text contrast. Check your headline at 0.3 and 0.6 before deciding. |
| `showStars` | `true` | Set `false` if you are placing the globe over a page that already has a background. |
| `cloudMap` | path | Pass `null` to drop the cloud layer entirely — saves a texture and a draw call. |

Cosmetic knobs live inside `EarthScene.tsx`:

- Camera distance: `camera={{ position: [0, 0, 3.3] }}` — larger z = smaller globe.
- Sun angle: `<directionalLight position={[5, 2, 4]} />` — this sets which
  hemisphere is lit and how dramatic the terminator looks.
- Glow color and strength: the `Atmosphere` uniforms. `uPower` higher = tighter
  rim, `uIntensity` higher = brighter.

---

## 5. Why it is built this way

**`next/dynamic` with `ssr: false`.** three.js reaches for `window` and `document`
at import time. Server-rendering it throws. This also keeps ~600KB of WebGL out
of the initial server bundle.

**Poster as a CSS background, not a React fallback state.** It is painted the
instant HTML arrives, covers the texture-loading gap, and is still there if
WebGL fails for any reason. One mechanism, three problems solved. There is no
error boundary because there is nothing to catch — failure just means the canvas
stays at `opacity: 0`.

**`frameloop="never"` instead of unmounting.** Pausing this way stops the render
loop but keeps the WebGL context and uploaded textures alive, so resuming is
instantaneous. Unmounting the canvas would free the memory but force a full
re-upload on return, which reads as a stutter every time the user switches tabs.

**`delta`-based rotation.** `rotation.y += 0.001` runs twice as fast on a 120Hz
display. `rotation.y += delta * rate` does not. Always the second one.

**Color space split.** The day map is a color, so it is tagged sRGB. The cloud
map is a mask, so it is tagged `NoColorSpace`. Tag the mask as sRGB and the
clouds come out too thin; forget to tag the day map and the planet looks
bleached. These are the two most common "why does it look wrong" bugs in R3F.

---

## 6. Troubleshooting

**Build error mentioning `Cannot use import statement outside a module`, pointing
at drei.** Add to `next.config.js`:

```js
module.exports = { transpilePackages: ['three'] }
```

**Black screen, no errors.** Textures are 404ing. Check the Network tab — paths
are relative to `public/`, so `/textures/earth-day.jpg` means
`public/textures/earth-day.jpg`.

**Planet looks flat and washed out.** The sRGB tag on the day map is missing or
your three.js version predates r152. Upgrade three.

**Seam or pinch at the poles.** Your day map is not exactly 2:1. Re-run the
resize with the `!` suffix.

**Fine on desktop, fan spins up on a laptop.** Drop `dpr` to `[1, 1]` and reduce
`<Stars count>`. If it persists, lower the sphere segments from `[1, 96, 64]`
to `[1, 64, 48]`.

---

## Optional upgrade: city lights on the night side

The realistic version — city lights glowing on the dark hemisphere — cannot be
done with `emissiveMap`, because that lights the day side too. It needs a custom
shader that blends the day and night textures based on the dot product of the
surface normal and the light direction. Worth doing, but it replaces
`meshStandardMaterial` with about 40 lines of GLSL, so it is a deliberate step
up in maintenance cost. Ask if you want it.
