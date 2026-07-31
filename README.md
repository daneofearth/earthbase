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

```bash
npm run dev
open http://localhost:3000/tune
```

Controls down the left, saved looks down the right, the live globe behind both.
Every visual value the scene uses is defined in `lib/earthConfig.ts` — that one
file is the shape of a saved preset, the defaults, and the list of sliders.
Adding a knob is one entry in `PARAMS` plus one line in `DEFAULTS`; the control
appears on its own.

### Where presets are stored, and who may change them

Two backends, chosen automatically:

| | Storage | Saving works | `/tune` |
|---|---|---|---|
| Supabase configured | `earth_presets` table | yes, anywhere | password required |
| not configured | JSON in `config/earth/` | local dev only | open in dev, 404 in prod |

With Supabase wired up, saving changes the public site immediately — the API
calls `revalidatePath('/')`, so there is no deploy step. Without it, the file
store still works locally, which is why a fresh clone with no environment runs.

### Who may tune

Accounts, via Supabase Auth. Sessions are cookies handled entirely server-side —
no Supabase key of any kind reaches the browser.

Two rules, and the second is the one doing the work:

1. You must be signed in.
2. Your email must appear in `TUNE_ALLOWED_EMAILS`.

Supabase accepts public sign-ups by default, so without the allowlist "has an
account" would mean "can rewrite the homepage" for anyone who found the URL —
and the URL is in a public repo. It is enforced when an account is created *and*
on every request afterwards, so an account made by some other route still cannot
tune.

**`/tune` returns 404 in production unless auth is configured.** Deliberate: a
deploy whose environment had not been filled in yet would otherwise be publicly
rewritable, and failing closed means that window never exists. With nothing
configured, local development stays open.

Confirmation emails land on `/auth/confirm`, which must be listed as a Redirect
URL in the Supabase dashboard.

See `.env.example` for the four variables and `supabase/migrations/` for the
schema.

Two things about the framing worth knowing before you reach for them:

- **Globe size** is the zoom. **Lens angle is not** — the camera distance is
  solved *from* the field of view so the globe fills the same fraction of the
  screen at any aspect ratio, which means the two cancel out. Widening the lens
  changes how much the sphere bulges toward you, not how big it is.
- Never hardcode a camera distance. A fixed one frames correctly for exactly
  one window shape and crops the planet off the edges of a phone.

**If you change how the globe looks, recapture the poster** (below), or the
still frame shown during load will be of the old planet.

### How a saved look reaches the live site

Tune it, name it, **Save**, then **Use this on the site**. With Supabase that is
the whole procedure — the home page updates on the next load. On the file
backend you also have to commit `config/earth/` and push.

Presets are treated as untrusted whenever they are read back, from either
backend: unknown keys dropped, numbers clamped into range. A preset saved
before a parameter existed, or a row edited by hand into nonsense, falls back to
sane values instead of putting a broken globe on the live site. With nothing
marked active, the site uses the built-in defaults — and it also falls back to
them if Supabase is unreachable, so a database outage costs the site its custom
look rather than its homepage.

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
