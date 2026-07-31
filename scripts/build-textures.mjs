/**
 * build-textures.mjs — fetch the source maps and produce public/textures/.
 *
 * The outputs are committed (about 1MB total), so a fresh clone and a Vercel
 * build both work without running this. Run it with `npm run textures` only to
 * regenerate — different resolution, different source month, better quality.
 * The 16MB source downloads are cached in .texture-cache/, which is gitignored.
 *
 * Sources are public domain / CC-BY (solarsystemscope.com/textures, which
 * mirrors NASA's Blue Marble). Both downloads are 8192x4096.
 *
 * The `!`-equivalent here is fit:'fill' — equirectangular maps must stay
 * exactly 2:1 or the geography pinches at the poles, so we force the exact
 * dimensions instead of preserving aspect ratio. The assertion below fails
 * the build rather than shipping a subtly stretched planet.
 */

import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'https://www.solarsystemscope.com/textures/download'
const CACHE = path.resolve('.texture-cache')
const OUT = path.resolve('public/textures')

const JOBS = [
  // 4096 wide is the sweet spot for a background globe — see the setup doc's
  // VRAM note before raising it.
  { src: '8k_earth_daymap.jpg', out: 'earth-day.jpg', w: 4096, h: 2048, q: 85 },
  // Small viewports get this one instead. The saving is not the download —
  // it is VRAM: on the GPU a 4096x2048 map is not its 0.6MB of JPEG, it is
  // 4096 x 2048 x 4 bytes of raw pixels, about 33MB, plus a third again for
  // mipmaps. This halves each dimension, so it costs a quarter of that.
  { src: '8k_earth_daymap.jpg', out: 'earth-day-2k.jpg', w: 2048, h: 1024, q: 85 },
  // Clouds are only ever sampled as a mask, so half resolution is invisible.
  { src: '8k_earth_clouds.jpg', out: 'earth-clouds.jpg', w: 2048, h: 1024, q: 82 },
]

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function download(name) {
  const dest = path.join(CACHE, name)
  if (await exists(dest)) {
    console.log(`  cached  ${name}`)
    return dest
  }
  console.log(`  fetch   ${name}`)
  const res = await fetch(`${SRC}/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  return dest
}

await mkdir(CACHE, { recursive: true })
await mkdir(OUT, { recursive: true })

for (const job of JOBS) {
  const src = await download(job.src)
  const dest = path.join(OUT, job.out)

  await sharp(src)
    .resize(job.w, job.h, { fit: 'fill' })
    .jpeg({ quality: job.q, mozjpeg: true })
    .toFile(dest)

  const { width, height } = await sharp(dest).metadata()
  if (width !== job.w || height !== job.h) {
    throw new Error(`${job.out}: expected ${job.w}x${job.h}, got ${width}x${height}`)
  }
  const { size } = await stat(dest)
  console.log(`  write   ${job.out}  ${width}x${height}  ${(size / 1024 / 1024).toFixed(2)}MB`)
}

console.log('\nTextures built. The poster (earth-poster.jpg) is captured separately —')
console.log('see README "Regenerating the poster".')
