/**
 * capture-poster.mjs — render public/textures/earth-poster.jpg from the live app.
 *
 * The poster is the container's CSS background, painted the instant HTML
 * arrives and sitting underneath both the canvas and the scrim. So it must be
 * the bare globe: no dark overlay, no headline. This script loads the running
 * dev server, strips the scrim and the foreground copy, waits for the canvas
 * to finish fading in, and shoots the result.
 *
 * Playwright is not a dependency of this app — it is only needed to regenerate
 * this one file. Before running:
 *
 *   npm install -D playwright && npx playwright install chromium
 *   npm run dev            # in another terminal
 *   node scripts/capture-poster.mjs http://localhost:3000
 *
 * Re-run it whenever the globe's look changes (camera, sun angle, glow), or the
 * poster will flash a stale planet before the canvas takes over.
 */

import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const url = process.argv[2] || 'http://localhost:3000'
const OUT = path.resolve('public/textures/earth-poster.jpg')
const TMP = path.resolve('.texture-cache/poster-raw.png')

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error(
    'playwright is not installed. Run:\n' +
      '  npm install -D playwright && npx playwright install chromium',
  )
  process.exit(1)
}

await mkdir(path.dirname(TMP), { recursive: true })

const browser = await chromium.launch({
  // Headless Chromium has no GPU, so WebGL needs an explicit software backend
  // or context creation fails and the canvas never appears.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForSelector('canvas', { timeout: 30000 })

// Wait for the component's own "textures loaded" signal — the fade wrapper
// reaching full opacity — rather than guessing with a fixed delay.
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas')
    return c && getComputedStyle(c.closest('div')).opacity === '1'
  },
  { timeout: 30000 },
)

// Strip everything that is not the globe: the scrim, and the page copy.
await page.evaluate(() => {
  const bg = document.querySelector('canvas')?.closest('[aria-hidden="true"]')
  if (bg) {
    // Everything in here that is not the canvas wrapper is either the scrim or
    // the previous poster, and neither belongs in the new one.
    for (const child of [...bg.children]) {
      if (!child.querySelector('canvas')) child.remove()
    }
  }
  for (const el of document.querySelectorAll('section > :not([aria-hidden="true"])')) {
    el.remove()
  }
  // The dev-server badge is a portal outside the page tree and will otherwise
  // be baked into the poster.
  for (const el of document.querySelectorAll('nextjs-portal')) el.remove()
})

await page.waitForTimeout(1200)
await page.screenshot({ path: TMP })
await browser.close()

// Under a dark scrim this never needs to be sharp — the doc's budget is 120KB.
await sharp(TMP).jpeg({ quality: 70, mozjpeg: true }).toFile(OUT)
await unlink(TMP).catch(() => {})

const { size } = await (await import('node:fs/promises')).stat(OUT)
console.log(`earth-poster.jpg  1920x1080  ${(size / 1024).toFixed(0)}KB`)
if (size > 120 * 1024) console.warn('over the 120KB budget — lower the quality')
