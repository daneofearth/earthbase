# Dane of Earth — app

The app that runs at **app.daneofearth.org**. The main site, `daneofearth.org`,
is a separate WordPress install and is not touched by anything in this repo.

Right now this is one page: a rotating Earth background with a placeholder
headline over it.

```bash
npm install
npm run dev        # http://localhost:3000
```

## What is here

```
app/page.tsx                     the landing page
components/earth/
  EarthBackground.tsx            ← import this
  EarthScene.tsx                 ← never imported directly
public/textures/                 committed, ~1.2MB total
scripts/build-textures.mjs       regenerates the maps from source
scripts/capture-poster.mjs       regenerates the poster from the live app
docs/EARTH-BACKGROUND-SETUP.md   the original spec these components came from
```

The two components arrived as a working drop with their own setup doc, kept in
`docs/`. That doc is still the best explanation of *why* the globe is built the
way it is — the color-space rules, the `frameloop="never"` pause, the poster
strategy. Read it before changing `EarthScene.tsx`.

A few things have changed since it was written, all noted in code comments:
the camera distance is now derived from the viewport rather than fixed, the
atmosphere glow is gated on the sun direction, the poster hands off to the
canvas instead of sitting behind it forever, and textures are configured through
`useTexture`'s `onLoad` instead of by mutating the returned object.

## Tuning the globe

Props on `<EarthBackground>` — `rotationPeriod`, `cloudPeriod`, `overlayOpacity`,
`showStars`, `cloudMap`. The setup doc has the full table.

Inside `EarthScene.tsx`:

- `fov` on the `<Canvas camera>` — makes the globe bigger or smaller. **Do not
  set the camera distance**; `FitCamera` computes it from the viewport, and a
  hardcoded value crops the planet off the edges of a phone.
- `SUN_POSITION` — which hemisphere is lit. The light and the atmosphere shader
  both read it, so they cannot drift apart.
- `ATMOSPHERE_SCALE` / `_POWER` / `_INTENSITY` — the rim glow.

**If you change how the globe looks, recapture the poster** (below), or the
still frame shown during load will be of the old one.

## Textures

`npm run textures` downloads the source maps and writes `public/textures/`.

The outputs are committed, so a fresh clone and a deploy both work without
running it. You only need it to change resolution or source. The 16MB downloads
are cached in `.texture-cache/` (gitignored).

Sources are public domain / CC-BY from
[solarsystemscope.com/textures](https://www.solarsystemscope.com/textures),
which mirrors NASA's Blue Marble.

Two sizes of day map ship: 4096×2048, and a 2048×1024 for viewports under
900px. That is a VRAM decision, not a bandwidth one — on the GPU the 4096 map
is not its 0.6MB of JPEG, it is ~33MB of raw pixels plus mipmaps.

Equirectangular maps must stay exactly 2:1 or the geography pinches at the
poles. The build script asserts the dimensions rather than trusting the resize.

### Regenerating the poster

The poster is the still frame painted before WebGL is ready, and the only thing
a visitor sees if WebGL fails or they have reduced motion on. It is captured
from the running app, so it needs a browser:

```bash
npm install -D playwright && npx playwright install chromium
npm run dev                                    # in another terminal
node scripts/capture-poster.mjs http://localhost:3000
```

Playwright is deliberately not a dependency — it is only needed for this.

## Deploying

Not deployed yet. Vercel is the path of least resistance (Next 16, static
output, Vercel CLI already installed), with `app.daneofearth.org` added as a
domain — that is a CNAME on the existing DNS and does not touch the records
pointing `daneofearth.org` at WordPress.

## Content

The headline and subhead in `app/page.tsx` are placeholders. Copy is HQ's lane.
