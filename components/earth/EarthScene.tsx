'use client'

/**
 * EarthScene — the WebGL half of the background.
 *
 * This file is never imported directly by a page. EarthBackground.tsx pulls it
 * in with next/dynamic + ssr:false, because three.js touches `window` and will
 * throw during server rendering.
 *
 * Everything here is real-time, so there is no loop point to get wrong. The
 * globe just keeps turning.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, Stars, useTexture } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const AXIAL_TILT = THREE.MathUtils.degToRad(23.4)

// One source of truth for the sun. The directional light and the atmosphere
// shader both read it — if they drift apart, the glow lights a different
// hemisphere than the terrain and the planet looks subtly wrong in a way that
// is very hard to trace back.
const SUN_POSITION: [number, number, number] = [5, 2, 4]

/* ------------------------------------------------------------------ Earth */

function Earth({ map, period }: { map: string; period: number }) {
  const ref = useRef<THREE.Mesh>(null!)

  // Configured through useTexture's own onLoad rather than by mutating the
  // texture it hands back. Same result, but it runs in a layout effect before
  // the first GPU upload, and the React Compiler's immutability rule rejects
  // writing to a value a hook returned.
  const configure = useCallback((t: THREE.Texture) => {
    // Color textures must be tagged sRGB or the planet renders washed out.
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
  }, [])

  const texture = useTexture(map, configure)

  // `delta` is seconds since the last frame, so the spin rate is identical
  // on a 60Hz laptop and a 144Hz monitor. Never increment by a fixed number.
  useFrame((_, delta) => {
    ref.current.rotation.y += (delta * Math.PI * 2) / period
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  )
}

/* ----------------------------------------------------------------- Clouds */

function Clouds({ map, period }: { map: string; period: number }) {
  const ref = useRef<THREE.Mesh>(null!)

  const configure = useCallback((t: THREE.Texture) => {
    // Used as an alpha mask, not a color, so it must NOT be tagged sRGB —
    // that would gamma-shift the transparency values.
    t.colorSpace = THREE.NoColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
  }, [])

  const texture = useTexture(map, configure)

  useFrame((_, delta) => {
    ref.current.rotation.y += (delta * Math.PI * 2) / period
  })

  return (
    <mesh ref={ref} scale={1.012}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshStandardMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={0.75}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------- Atmosphere */

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorldNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    // World space, because the sun is specified in world space and this mesh
    // sits inside the tilted group.
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

// Fresnel: the glow is strongest where the surface faces away from the camera,
// i.e. the rim. dot(normal, viewDir) goes to 0 at the edges, so 1 - that
// goes to 1. Raising it to a power tightens the band.
//
// The fresnel term alone rings the entire disc at equal brightness, including
// the hemisphere the sun never reaches, which is what makes a naive glow read
// as a painted-on ring. Air only scatters light that hits it, so the rim is
// also gated on how sun-facing the fragment is, fading out through the
// terminator. That gate is the difference between "atmosphere" and "neon hoop".
const atmosphereFragment = /* glsl */ `
  uniform vec3  uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform vec3  uSunDir;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorldNormal;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    float lit = smoothstep(-0.35, 0.45, dot(normalize(vWorldNormal), normalize(uSunDir)));
    gl_FragColor = vec4(uColor, rim * lit * uIntensity);
  }
`

// The shell's radius decides how far the glow can reach past the surface. The
// fresnel term peaks at the shell's own silhouette and is hard-cut to nothing
// outside it, so a wide shell (the original 1.16) puts a crisp edge well off
// the planet and reads as a detached hoop. Keeping it tight holds the glow on
// the limb, where the eye expects it.
const ATMOSPHERE_SCALE = 1.05
const ATMOSPHERE_POWER = 2.2
const ATMOSPHERE_INTENSITY = 1.15

function Atmosphere({ color = '#4a9eff' }: { color?: string }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uPower: { value: ATMOSPHERE_POWER },
      uIntensity: { value: ATMOSPHERE_INTENSITY },
      uSunDir: { value: new THREE.Vector3(...SUN_POSITION).normalize() },
    }),
    [color],
  )

  return (
    <mesh scale={ATMOSPHERE_SCALE}>
      <sphereGeometry args={[1, 64, 48]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

/* --------------------------------------------------------- camera framing */

/**
 * Frames the globe against whichever viewport dimension is smaller.
 *
 * A fixed camera distance only ever looks right at one aspect ratio. Tuned for
 * a landscape window, a portrait phone crops the sphere off every edge and the
 * background stops reading as a planet at all — it becomes a blue wall. This
 * solves for the distance that fits a unit-radius sphere in view, then applies
 * the horizontal constraint too once the viewport goes portrait.
 */
function FitCamera({ margin = 1.4 }: { margin?: number }) {
  const { camera, size } = useThree()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const halfFov = THREE.MathUtils.degToRad(cam.fov) / 2
    const aspect = size.width / size.height
    cam.position.setZ(margin / (Math.tan(halfFov) * Math.min(1, aspect)))
    cam.updateProjectionMatrix()
  }, [camera, size, margin])

  return null
}

/* ------------------------------------------------------- load-complete ping */

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

/* ------------------------------------------------------------------ Scene */

export type EarthSceneProps = {
  dayMap?: string
  cloudMap?: string | null
  /** Seconds for one full rotation. 120 is a slow, calm drift. */
  rotationPeriod?: number
  /** Clouds turn slightly faster for parallax. */
  cloudPeriod?: number
  /** false = stop rendering entirely (tab hidden, scrolled away). */
  active?: boolean
  showStars?: boolean
  onReady?: () => void
}

/**
 * Picks the day map before the first render rather than swapping it later.
 *
 * This file only ever executes in the browser — EarthBackground pulls it in
 * with ssr:false — so reading `window` here is safe, and it matters that the
 * choice is made *now*: deciding in an effect would load the big texture, then
 * throw it away and load the small one, which is worse than either.
 */
function pickDayMap() {
  if (typeof window === 'undefined') return '/textures/earth-day.jpg'
  return window.innerWidth > 900 ? '/textures/earth-day.jpg' : '/textures/earth-day-2k.jpg'
}

export default function EarthScene({
  dayMap = pickDayMap(),
  cloudMap = '/textures/earth-clouds.jpg',
  rotationPeriod = 120,
  cloudPeriod = 90,
  active = true,
  showStars = true,
  onReady,
}: EarthSceneProps) {
  return (
    <Canvas
      // "never" halts the render loop without tearing down the WebGL context,
      // so resuming is instant and costs nothing while paused.
      frameloop={active ? 'always' : 'never'}
      // Cap pixel ratio. A background does not need full retina, and this is
      // the single biggest performance lever on a 3x phone display.
      dpr={[1, 1.5]}
      // Only the initial pose — FitCamera derives the distance from the
      // viewport on mount and on every resize. `fov` is the knob to turn if you
      // want the globe bigger or smaller; distance is no longer yours to set.
      camera={{ position: [0, 0, 3.3], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
    >
      <FitCamera />
      <ambientLight intensity={0.08} />
      <directionalLight position={SUN_POSITION} intensity={2.4} />

      {showStars && (
        <Stars radius={80} depth={40} count={2500} factor={3} fade speed={0} />
      )}

      <Suspense fallback={null}>
        <group rotation={[0, 0, AXIAL_TILT]}>
          <Earth map={dayMap} period={rotationPeriod} />
          {cloudMap && <Clouds map={cloudMap} period={cloudPeriod} />}
          <Atmosphere />
        </group>
        <Preload all />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
