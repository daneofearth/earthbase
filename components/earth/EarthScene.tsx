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
 *
 * Every visual value comes in as an EarthConfig — see lib/earthConfig.ts. There
 * are no magic numbers left in this file on purpose: the tuner at /tune edits
 * that config, so anything hardcoded here is a knob nobody can reach.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Preload, Stars, useTexture } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { EarthConfig } from '@/lib/earthConfig'

const DEG = THREE.MathUtils.degToRad

/** Compass angle + height, which people can picture, into a direction vector. */
function sunVector(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = DEG(azimuthDeg)
  const el = DEG(elevationDeg)
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize()
}

/* ------------------------------------------------------------------ Earth */

function Earth({
  map,
  period,
  reverse,
  startLongitude,
}: {
  map: string
  period: number
  reverse: boolean
  startLongitude: number
}) {
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

  useEffect(() => {
    ref.current.rotation.y = DEG(startLongitude)
  }, [startLongitude])

  // `delta` is seconds since the last frame, so the spin rate is identical
  // on a 60Hz laptop and a 144Hz monitor. Never increment by a fixed number.
  useFrame((_, delta) => {
    if (period <= 0) return
    ref.current.rotation.y += ((reverse ? -1 : 1) * delta * Math.PI * 2) / period
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  )
}

/* ----------------------------------------------------------------- Clouds */

function Clouds({
  map,
  period,
  reverse,
  startLongitude,
  opacity,
  altitude,
}: {
  map: string
  period: number
  reverse: boolean
  startLongitude: number
  opacity: number
  altitude: number
}) {
  const ref = useRef<THREE.Mesh>(null!)

  const configure = useCallback((t: THREE.Texture) => {
    // Used as an alpha mask, not a color, so it must NOT be tagged sRGB —
    // that would gamma-shift the transparency values.
    t.colorSpace = THREE.NoColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
  }, [])

  const texture = useTexture(map, configure)

  useEffect(() => {
    ref.current.rotation.y = DEG(startLongitude)
  }, [startLongitude])

  useFrame((_, delta) => {
    if (period <= 0) return
    ref.current.rotation.y += ((reverse ? -1 : 1) * delta * Math.PI * 2) / period
  })

  return (
    <mesh ref={ref} scale={altitude}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshStandardMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={opacity}
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

function Atmosphere({
  color,
  reach,
  tightness,
  brightness,
  sunDir,
}: {
  color: string
  reach: number
  tightness: number
  brightness: number
  sunDir: THREE.Vector3
}) {
  // Rebuilt rather than mutated when a value changes. Tuning is rare and the
  // shader program itself is unaffected, so recreating the uniforms object is
  // cheaper than it looks and avoids writing into a hook's return value.
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uPower: { value: tightness },
      uIntensity: { value: brightness },
      uSunDir: { value: sunDir },
    }),
    [color, tightness, brightness, sunDir],
  )

  return (
    <mesh scale={reach}>
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
 * How much of the screen the globe covers, and where it sits.
 *
 * A fixed camera distance only ever looks right at one aspect ratio — tuned for
 * a landscape window, a portrait phone crops the sphere off every edge and the
 * background stops reading as a planet at all. So the distance is solved for
 * instead, against whichever viewport dimension is smaller.
 *
 * Note what this means for `lens`: distance is derived *from* the field of
 * view, so the two cancel and the globe's on-screen size depends only on
 * `globeSize`. Widening the lens changes how much the sphere bulges toward the
 * viewer, not how big it is.
 *
 * Returns the visible half-extents in world units, which is what lets the
 * offsets be expressed as a fraction of the screen rather than in scene units
 * that would drift every time the size changed, plus the camera distance the
 * scene renders declaratively.
 */
function useViewport(globeSize: number, lens: number) {
  const size = useThree((state) => state.size)
  const aspect = size.width / size.height

  // Half-height in world units. The globe has radius 1, so a half-height of
  // 1/globeSize makes the diameter cover exactly `globeSize` of the short edge.
  const halfHeight = 1 / (globeSize * Math.min(1, aspect))

  return {
    halfHeight,
    halfWidth: halfHeight * aspect,
    distance: halfHeight / Math.tan(DEG(lens) / 2),
  }
}

/* ------------------------------------------------------- load-complete ping */

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

/* ------------------------------------------------------------------ Scene */

function SceneContents({ config, onReady }: { config: EarthConfig; onReady?: () => void }) {
  const { halfWidth, halfHeight, distance } = useViewport(config.globeSize, config.lens)
  const sunDir = useMemo(
    () => sunVector(config.sunAzimuth, config.sunElevation),
    [config.sunAzimuth, config.sunElevation],
  )
  const sunPos = useMemo(() => sunDir.clone().multiplyScalar(10), [sunDir])

  const dayMap = useDayMap()
  const cloudPeriod =
    config.cloudSpeedRatio > 0 ? config.rotationPeriod / config.cloudSpeedRatio : 0

  return (
    <>
      {/* Declared rather than mutated after the fact, so fov and distance stay
          derived from the config instead of drifting out of sync with it. */}
      <PerspectiveCamera makeDefault fov={config.lens} position={[0, 0, distance]} />

      <ambientLight intensity={config.nightFill} />
      <directionalLight position={sunPos} intensity={config.sunIntensity} />

      {config.starsEnabled && config.starCount > 0 && (
        // `key` because drei builds the star field once from these values;
        // without it, dragging the count slider does nothing visible.
        <Stars
          key={`${config.starCount}-${config.starSize}`}
          radius={80}
          depth={40}
          count={config.starCount}
          factor={config.starSize}
          fade
          speed={0}
        />
      )}

      <Suspense fallback={null}>
        <group
          position={[config.offsetX * halfWidth, config.offsetY * halfHeight, 0]}
          rotation={[DEG(config.nod), 0, DEG(config.tilt)]}
        >
          <Earth
            map={dayMap}
            period={config.rotationPeriod}
            reverse={config.reverse}
            startLongitude={config.startLongitude}
          />
          {config.cloudsEnabled && (
            <Clouds
              map="/textures/earth-clouds.jpg"
              period={cloudPeriod}
              reverse={config.reverse}
              startLongitude={config.startLongitude}
              opacity={config.cloudOpacity}
              altitude={config.cloudAltitude}
            />
          )}
          <Atmosphere
            color={config.atmosphereColor}
            reach={config.atmosphereReach}
            tightness={config.atmosphereTightness}
            brightness={config.atmosphereBrightness}
            sunDir={sunDir}
          />
        </group>
        <Preload all />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </>
  )
}

/**
 * Picks the day map once, on the first render, rather than swapping it later.
 *
 * This file only ever executes in the browser — EarthBackground pulls it in
 * with ssr:false — so reading `window` is safe, and it matters that the choice
 * is made *now*: deciding in an effect would load the big texture, then throw
 * it away and load the small one, which is worse than either.
 *
 * The saving is not bandwidth, it is VRAM. On the GPU the 4096x2048 map is not
 * its 0.6MB of JPEG, it is ~33MB of raw pixels plus mipmaps.
 */
function useDayMap() {
  // Lazy initial state, so this is evaluated once for the life of the scene.
  // Recomputing per render would swap the texture mid-session on a resize.
  const [map] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 900
      ? '/textures/earth-day-2k.jpg'
      : '/textures/earth-day.jpg',
  )
  return map
}

export type EarthSceneProps = {
  config: EarthConfig
  /** false = stop rendering entirely (tab hidden, scrolled away). */
  active?: boolean
  onReady?: () => void
}

export default function EarthScene({ config, active = true, onReady }: EarthSceneProps) {
  return (
    <Canvas
      // "never" halts the render loop without tearing down the WebGL context,
      // so resuming is instant and costs nothing while paused.
      frameloop={active ? 'always' : 'never'}
      // Cap pixel ratio. A background does not need full retina, and this is
      // the single biggest performance lever on a 3x phone display.
      dpr={[1, 1.5]}
      // No `camera` prop: SceneContents declares a PerspectiveCamera with
      // makeDefault, so fov and distance come from the config in one place.
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
    >
      <SceneContents config={config} onReady={onReady} />
    </Canvas>
  )
}
