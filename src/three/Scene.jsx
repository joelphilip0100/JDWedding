import { useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PATH,
  CHURCH,
  SUN_DIR,
  PALETTE,
  seeded,
  petalTexture,
  groundGeometry,
  pathRibbonGeometry,
  makeSkyMaterial,
  WIND,
  AUTUMN,
  BLOOMS,
} from './world.js'
import { buildMaps, leafTexture, blossomTexture, sparkTexture } from './textures.js'

const V = new THREE.Vector3()
const V2 = new THREE.Vector3()
const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()
const E = new THREE.Euler()
const S = new THREE.Vector3(1, 1, 1)
const C = new THREE.Color()
const UP = new THREE.Vector3(0, 1, 0)

/* ===================================================================== */
function SkyDome({ material }) {
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[300, 48, 28]} />
    </mesh>
  )
}

function SkyEnvironment({ material }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const tmp = new THREE.Scene()
    tmp.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), material))
    const rt = pmrem.fromScene(tmp, 0, 0.1, 60)
    scene.environment = rt.texture
    scene.environmentIntensity = 1.1
    return () => {
      rt.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, material])
  return null
}

/* warm haze in depth + the sun's bloom behind the church */
function Atmosphere() {
  const glow = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')
    const g = x.createRadialGradient(128, 128, 4, 128, 128, 126)
    g.addColorStop(0, 'rgba(255,246,220,0.95)')
    g.addColorStop(0.35, 'rgba(255,226,168,0.42)')
    g.addColorStop(1, 'rgba(255,214,150,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const sunPos = useMemo(() => SUN_DIR.clone().multiplyScalar(178), [])
  return (
    <group>
      <mesh position={[sunPos.x, 20, sunPos.z]} renderOrder={-1}>
        <planeGeometry args={[190, 190]} />
        <meshBasicMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          opacity={0.85}
        />
      </mesh>
      {[
        [-46, 0.10, 150],
        [-84, 0.085, 220],
        [-128, 0.07, 300],
      ].map(([z, o, w]) => (
        <mesh key={z} position={[0, 14, z]} renderOrder={1}>
          <planeGeometry args={[w, 70]} />
          <meshBasicMaterial color="#f8d3a0" transparent opacity={o} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ===================================================================== */
function Ground({ maps, quality }) {
  const geo = useMemo(() => groundGeometry(), [])
  const ribbon = useMemo(() => pathRibbonGeometry(), [])

  const stones = useMemo(() => {
    const rnd = seeded(20261021)
    const out = []
    const n = 190
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 0.985
      const p = PATH.getPointAt(u)
      const t = PATH.getTangentAt(u)
      const nrm = new THREE.Vector3().crossVectors(UP, t).normalize()
      const side = ((i % 3) - 1) * (0.3 + rnd() * 0.26)
      const w = 1 - u * 0.3
      out.push({
        pos: [p.x + nrm.x * side * w, 0.05, p.z + nrm.z * side * w],
        rot: Math.atan2(t.x, t.z) + (rnd() - 0.5) * 0.6,
        s: (0.78 + rnd() * 0.28) * w,
        tilt: (rnd() - 0.5) * 0.06,
      })
    }
    return out
  }, [])

  const ref = useRef()
  useLayoutEffect(() => {
    stones.forEach((s, i) => {
      E.set(s.tilt, s.rot, s.tilt * 0.6)
      Q.setFromEuler(E)
      S.set(s.s * 1.3, 1, s.s)
      M.compose(V.set(...s.pos), Q, S)
      ref.current.setMatrixAt(i, M)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [stones])

  return (
    <group>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial
          map={maps.grassMap}
          normalMap={maps.grassNormal}
          normalScale={[0.8, 0.8]}
          roughness={0.98}
        />
      </mesh>
      <mesh geometry={ribbon} receiveShadow>
        <meshStandardMaterial map={maps.stoneMap} normalMap={maps.stoneNormal} color="#c2b393" roughness={1} />
      </mesh>
      <instancedMesh ref={ref} args={[null, null, stones.length]} receiveShadow castShadow={quality !== 'low'}>
        <cylinderGeometry args={[0.34, 0.34, 0.055, 10]} />
        <meshStandardMaterial
          map={maps.stoneMap}
          normalMap={maps.stoneNormal}
          normalScale={[1.1, 1.1]}
          roughnessMap={maps.stoneRough}
          roughness={1}
        />
      </instancedMesh>
    </group>
  )
}

/* =====================================================================
   TREES — each one is a trunk, a few real branches, and eight
   overlapping leaf masses at different sizes, tints and angles. That
   layering is what stops them reading as lollipops.
   ===================================================================== */
const CANOPY = {
  // broad, domed crown
  0: [
    [0, 4.3, 0, 2.35, 0.92], [-1.7, 3.7, 0.5, 1.62, 0.9], [1.75, 3.85, -0.4, 1.55, 0.92],
    [0.5, 3.4, 1.7, 1.5, 0.86], [-0.6, 3.5, -1.75, 1.48, 0.86], [0.9, 5.4, 0.55, 1.35, 0.8],
    [-1.0, 5.25, -0.5, 1.25, 0.8], [0.1, 6.1, 0.1, 0.95, 0.78],
  ],
  // tall and narrow, like a cypress
  1: [
    [0, 3.2, 0, 1.45, 1.05], [0.35, 4.4, -0.2, 1.3, 1.05], [-0.3, 5.5, 0.25, 1.12, 1.0],
    [0.2, 6.5, 0.15, 0.92, 0.95], [-0.15, 7.35, -0.2, 0.72, 0.9], [0.05, 8.05, 0.05, 0.5, 0.85],
    [0.6, 3.9, 0.5, 0.85, 0.9], [-0.6, 4.8, -0.5, 0.8, 0.9],
  ],
  // low and spreading
  2: [
    [0, 3.3, 0, 2.15, 0.66], [-2.2, 3.05, 0.6, 1.7, 0.6], [2.25, 3.15, -0.5, 1.65, 0.62],
    [0.6, 2.95, 2.1, 1.6, 0.58], [-0.7, 3.0, -2.15, 1.55, 0.58], [1.5, 3.9, 1.2, 1.25, 0.6],
    [-1.6, 3.95, -1.1, 1.2, 0.6], [0, 4.4, 0, 1.35, 0.6],
  ],
}

/* the whole crown leans with the gusts, more the higher it sits */
function swayCanopy(shader) {
  shader.uniforms.uTime = WIND.time
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n uniform float uTime;`)
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec3 iPos = instanceMatrix[3].xyz;
       float ph = iPos.x * 0.31 + iPos.z * 0.17;
       float hgt = clamp(iPos.y / 8.0, 0.0, 1.0);
       float gust = 0.55 + 0.45 * sin(uTime * 0.23 + iPos.x * 0.02);
       transformed.x += (sin(uTime * 1.15 + ph) * 0.16 + sin(uTime * 2.6 + ph * 1.9) * 0.05) * hgt * gust;
       transformed.z += cos(uTime * 0.87 + ph * 1.3) * 0.10 * hgt * gust;
       transformed.y -= abs(sin(uTime * 1.15 + ph)) * 0.03 * hgt * gust;`
    )
}

function Trees({ maps, quality }) {
  const trees = useMemo(() => {
    const rnd = seeded(77123)
    const out = []
    for (let i = 0; i < 76; i++) {
      const side = rnd() > 0.5 ? 1 : -1
      const type = rnd() < 0.24 ? 1 : rnd() < 0.6 ? 0 : 2
      out.push({
        x: side * (13 + rnd() * 64),
        z: 26 - rnd() * 162,
        s: (type === 1 ? 0.7 : 0.8) + rnd() * 0.85,
        rot: rnd() * Math.PI * 2,
        type,
        hue: rnd(),
        lean: (rnd() - 0.5) * 0.07,
      })
    }
    return out
  }, [])

  const blobCount = trees.length * 8
  const FRUIT_PER = 16
  const trunk = useRef()
  const branch = useRef()
  const leaves = useRef()
  const fruit = useRef()

  /* rowan-red and orange fruit hung near the outside of the crowns */
  const fruits = useMemo(() => {
    const rnd = seeded(24680)
    const out = []
    trees.forEach((t) => {
      const blobs = CANOPY[t.type]
      for (let k = 0; k < FRUIT_PER; k++) {
        const [bx, by, bz, br] = blobs[(rnd() * blobs.length) | 0]
        // push it out to the surface of that leaf mass so it is not buried
        const a = rnd() * Math.PI * 2
        const e = Math.acos(rnd() * 1.6 - 0.6)
        const rad = br * (0.82 + rnd() * 0.2)
        out.push({
          x: t.x + (bx + Math.sin(e) * Math.cos(a) * rad) * t.s,
          y: (by + Math.cos(e) * rad * 0.8) * t.s,
          z: t.z + (bz + Math.sin(e) * Math.sin(a) * rad) * t.s,
          r: (0.105 + rnd() * 0.07) * t.s,
          warm: rnd(),
        })
      }
    })
    return out
  }, [trees])

  useLayoutEffect(() => {
    let b = 0
    let l = 0
    trees.forEach((t) => {
      E.set(t.lean, t.rot, t.lean * 0.5)
      Q.setFromEuler(E)

      // trunk
      S.set(t.s, t.s, t.s)
      M.compose(V.set(t.x, 1.75 * t.s, t.z), Q, S)
      trunk.current.setMatrixAt(b++, M)

      // three branches angling out of it
      for (let k = 0; k < 3; k++) {
        const a = t.rot + k * 2.1
        E.set(0.75, a, 0)
        Q.setFromEuler(E)
        S.set(t.s * 0.55, t.s * 1.15, t.s * 0.55)
        M.compose(
          V.set(t.x + Math.sin(a) * 0.55 * t.s, (2.5 + k * 0.45) * t.s, t.z + Math.cos(a) * 0.55 * t.s),
          Q,
          S
        )
        branch.current.setMatrixAt(l++, M)
      }
    })
    trunk.current.instanceMatrix.needsUpdate = true
    branch.current.instanceMatrix.needsUpdate = true
  }, [trees])

  /* leaf masses get their own pass so the colour can vary per blob */
  useLayoutEffect(() => {
    let i = 0
    trees.forEach((t) => {
      CANOPY[t.type].forEach(([bx, by, bz, br, bsy], k) => {
        E.set(k * 0.7 + t.hue * 3, t.rot + k * 1.3, k * 0.4)
        Q.setFromEuler(E)
        S.set(br * t.s, br * bsy * t.s, br * t.s)
        M.compose(V.set(t.x + bx * t.s, by * t.s, t.z + bz * t.s), Q, S)
        leaves.current.setMatrixAt(i, M)

        // most of the wood has turned; a few trees are still holding green.
        // higher, sunward masses are lighter and further along.
        const lift = THREE.MathUtils.clamp((by - 2.8) / 4.5, 0, 1)
        if (t.hue < 0.12) {
          C.setHSL(0.19 - lift * 0.02, 0.34, 0.24 + lift * 0.14)
        } else {
          const h = 0.035 + ((t.hue - 0.12) / 0.88) * 0.085 + lift * 0.012 + k * 0.003
          C.setHSL(h, 0.58 + t.hue * 0.18, 0.27 + lift * 0.19)
        }
        leaves.current.setColorAt(i, C)
        i++
      })
    })
    leaves.current.instanceMatrix.needsUpdate = true
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true

    fruits.forEach((f, i) => {
      Q.identity()
      S.set(f.r, f.r * 1.08, f.r)
      M.compose(V.set(f.x, f.y, f.z), Q, S)
      fruit.current.setMatrixAt(i, M)
      // scarlet through to a deep orange
      C.setHSL(0.035 + f.warm * 0.035, 0.86, 0.42 + f.warm * 0.09)
      fruit.current.setColorAt(i, C)
    })
    fruit.current.instanceMatrix.needsUpdate = true
    if (fruit.current.instanceColor) fruit.current.instanceColor.needsUpdate = true
  }, [trees, fruits])

  const cast = quality !== 'low'
  return (
    <group>
      <instancedMesh ref={trunk} args={[null, null, trees.length]} castShadow={cast} receiveShadow>
        <cylinderGeometry args={[0.24, 0.42, 3.5, 9]} />
        <meshStandardMaterial map={maps.barkMap} normalMap={maps.barkNormal} color={PALETTE.trunk} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={branch} args={[null, null, trees.length * 3]} castShadow={false}>
        <cylinderGeometry args={[0.07, 0.16, 2.2, 6]} />
        <meshStandardMaterial map={maps.barkMap} color={PALETTE.trunk} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[null, null, blobCount]} castShadow={cast} receiveShadow>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial roughness={0.95} flatShading onBeforeCompile={swayCanopy} customProgramCacheKey={() => 'canopy'} />
      </instancedMesh>
      <instancedMesh ref={fruit} args={[null, null, trees.length * FRUIT_PER]} castShadow={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.34} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}

/* ===================================================================== */
function Church({ maps, quality }) {
  const roofGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-6.3, 0)
    s.lineTo(0, 4.3)
    s.lineTo(6.3, 0)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 15.4, bevelEnabled: false })
    g.translate(0, 0, -7.7)
    return g
  }, [])
  const doorGeo = useMemo(() => {
    const d = new THREE.Shape()
    d.moveTo(-1.15, 0)
    d.lineTo(-1.15, 2.1)
    d.absarc(0, 2.1, 1.15, Math.PI, 0, true)
    d.lineTo(1.15, 0)
    d.closePath()
    return new THREE.ExtrudeGeometry(d, { depth: 0.34, bevelEnabled: false })
  }, [])
  const winGeo = useMemo(() => {
    const d = new THREE.Shape()
    d.moveTo(-0.42, 0)
    d.lineTo(-0.42, 1.05)
    d.absarc(0, 1.05, 0.42, Math.PI, 0, true)
    d.lineTo(0.42, 0)
    d.closePath()
    return new THREE.ExtrudeGeometry(d, { depth: 0.2, bevelEnabled: false })
  }, [])

  const wall = (
    <meshStandardMaterial map={maps.plasterMap} normalMap={maps.plasterNormal} normalScale={[0.9, 0.9]} roughness={0.96} />
  )
  const dressed = (
    <meshStandardMaterial map={maps.stoneMap} normalMap={maps.stoneNormal} color="#e6d8b8" roughness={0.95} />
  )
  const glow = () => <meshBasicMaterial color={PALETTE.glow} toneMapped={false} />
  const cast = quality !== 'low'

  return (
    <group position={[CHURCH.x, 0, CHURCH.z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.12 + i * 0.2, 11.9 - i * 0.55]} receiveShadow castShadow={cast}>
          <boxGeometry args={[7.4 - i * 0.9, 0.2, 1.5 - i * 0.3]} />
          {dressed}
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow={cast}>
        <boxGeometry args={[13.4, 0.6, 17.4]} />
        {dressed}
      </mesh>
      <mesh position={[0, 3.9, 0]} castShadow={cast} receiveShadow>
        <boxGeometry args={[11.6, 6.6, 15]} />
        {wall}
      </mesh>
      <mesh position={[0, 7.25, 0]} castShadow={cast}>
        <boxGeometry args={[12.3, 0.4, 15.7]} />
        {dressed}
      </mesh>
      {[-5.2, -1.4, 2.4].map((z) =>
        [-1, 1].map((s) => (
          <mesh key={`bt${z}${s}`} position={[s * 6.0, 2.4, z]} castShadow={cast} receiveShadow>
            <boxGeometry args={[0.9, 4.8, 1.1]} />
            {dressed}
          </mesh>
        ))
      )}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`q${sx}${sz}`} position={[sx * 5.85, 3.6, sz * 7.5]} castShadow={cast}>
            <boxGeometry args={[0.55, 7, 0.55]} />
            {dressed}
          </mesh>
        ))
      )}
      <mesh geometry={roofGeo} position={[0, 7.4, 0]} castShadow={cast}>
        <meshStandardMaterial map={maps.roofMap} normalMap={maps.roofNormal} normalScale={[1.2, 1.2]} roughness={0.95} />
      </mesh>
      <mesh position={[0, 11.72, 0]} castShadow={cast}>
        <boxGeometry args={[0.5, 0.34, 15.5]} />
        {dressed}
      </mesh>
      <mesh position={[7.6, 2.4, -2.4]} castShadow={cast} receiveShadow>
        <boxGeometry args={[4.4, 4.2, 7]} />
        {wall}
      </mesh>
      <mesh position={[7.6, 5.2, -2.4]} castShadow={cast}>
        <coneGeometry args={[3.6, 2.5, 4]} />
        <meshStandardMaterial map={maps.roofMap} normalMap={maps.roofNormal} roughness={0.95} />
      </mesh>
      <mesh position={[0, 6.6, 8.4]} castShadow={cast} receiveShadow>
        <boxGeometry args={[4.6, 13.2, 4.6]} />
        {wall}
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`tq${sx}${sz}`} position={[sx * 2.3, 6.6, 8.4 + sz * 2.3]} castShadow={cast}>
            <boxGeometry args={[0.42, 13.2, 0.42]} />
            {dressed}
          </mesh>
        ))
      )}
      <mesh position={[0, 13.35, 8.4]} castShadow={cast}>
        <boxGeometry args={[5.5, 0.42, 5.5]} />
        {dressed}
      </mesh>
      <mesh position={[0, 15.4, 8.4]} rotation={[0, Math.PI / 4, 0]} castShadow={cast}>
        <coneGeometry args={[3.6, 4.8, 4]} />
        <meshStandardMaterial map={maps.roofMap} normalMap={maps.roofNormal} roughness={0.95} />
      </mesh>
      <group position={[0, 19.05, 8.4]}>
        {/* a ball finial seated on the spire, then the cross */}
        <mesh position={[0, -1.42, 0]} castShadow={cast}>
          <sphereGeometry args={[0.36, 18, 14]} />
          <meshStandardMaterial color="#b8892e" metalness={0.85} roughness={0.26} />
        </mesh>
        <mesh castShadow={cast}>
          <boxGeometry args={[0.34, 2.9, 0.34]} />
          <meshStandardMaterial color="#c39733" metalness={0.85} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow={cast}>
          <boxGeometry args={[1.75, 0.34, 0.34]} />
          <meshStandardMaterial color="#c39733" metalness={0.85} roughness={0.24} />
        </mesh>
        {[[-0.88, 0.55], [0.88, 0.55], [0, 1.45]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]} castShadow={cast}>
            <sphereGeometry args={[0.2, 14, 12]} />
            <meshStandardMaterial color="#d8ac48" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} geometry={winGeo} position={[s * 1.1, 9.5, 10.72]} scale={[1, 1.25, 1]}>
          <meshBasicMaterial color="#33241a" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 10.62]} castShadow={cast}>
        <boxGeometry args={[3.4, 4.6, 0.34]} />
        {dressed}
      </mesh>
      <mesh geometry={doorGeo} position={[0, 0.66, 10.8]} scale={[1.05, 1.05, 1]}>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
      </mesh>
      <mesh geometry={doorGeo} position={[0, 0.72, 10.72]} scale={[0.84, 0.92, 1]}>
        {glow()}
      </mesh>
      <pointLight position={[0, 2.4, 11.8]} color="#ffcf8f" intensity={34} distance={18} decay={2} />
      <mesh position={[0, 5.6, 10.78]}>
        <circleGeometry args={[0.92, 28]} />
        {glow()}
      </mesh>
      <mesh position={[0, 5.6, 10.75]}>
        <ringGeometry args={[0.92, 1.18, 28]} />
        {dressed}
      </mesh>
      {[-4.6, -0.6, 3.4].map((z, i) =>
        [-1, 1].map((s) => (
          <mesh
            key={`w${i}${s}`}
            geometry={winGeo}
            position={[s * 5.82, 2.8, z]}
            rotation={[0, (s * Math.PI) / 2, 0]}
            scale={[1.1, 1.35, 1]}
          >
            {glow()}
          </mesh>
        ))
      )}
    </group>
  )
}

/* ===================================================================== */
function Bride({ maps }) {
  /* the gown is a surface of revolution: hem, sweep, waist, bodice */
  const gown = useMemo(() => {
    const pts = [
      [0.68, 0.0], [0.65, 0.08], [0.58, 0.24], [0.49, 0.44], [0.40, 0.64],
      [0.31, 0.82], [0.245, 0.96], [0.205, 1.05], [0.188, 1.11], [0.196, 1.17],
      [0.212, 1.24], [0.216, 1.31], [0.196, 1.38], [0.16, 1.43], [0.11, 1.455],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 56)
  }, [])
  const veil = useMemo(() => {
    const pts = [
      [0.05, 1.49], [0.20, 1.37], [0.32, 1.14], [0.43, 0.84],
      [0.54, 0.5], [0.66, 0.16], [0.76, 0.0],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 44)
  }, [])

  const silk = (
    <meshStandardMaterial
      color={PALETTE.gown}
      roughnessMap={maps.silkRough}
      normalMap={maps.silkNormal}
      normalScale={[0.35, 0.35]}
      roughness={0.54}
      sheen={0.85}
      sheenColor="#fff6e6"
    />
  )
  const skin = <meshStandardMaterial color={PALETTE.skin} roughness={0.72} />

  return (
    <group>
      <mesh geometry={gown} castShadow receiveShadow>{silk}</mesh>
      <mesh geometry={veil} position={[0, 0.02, -0.03]}>
        <meshPhysicalMaterial
          color="#ffffff" transparent opacity={0.3} roughness={0.42}
          transmission={0.35} thickness={0.1} side={THREE.DoubleSide} depthWrite={false}
        />
      </mesh>

      {/* shoulders, so the bodice has a top rather than stopping flat */}
      <mesh position={[0, 1.44, 0]} scale={[1, 0.46, 0.78]} castShadow>
        <sphereGeometry args={[0.2, 24, 16]} />
        {silk}
      </mesh>
      {/* collarbone and neck */}
      <mesh position={[0, 1.5, 0]} rotation={[0.06, 0, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.066, 0.1, 16]} />
        {skin}
      </mesh>

      {/* upper arm and forearm, with a soft bend at the elbow */}
      <mesh position={[0.175, 1.325, 0.01]} rotation={[0, 0, -0.34]} castShadow>
        <capsuleGeometry args={[0.041, 0.2, 6, 14]} />
        {silk}
      </mesh>
      <mesh position={[0.235, 1.15, 0.045]} rotation={[0.22, 0, -0.62]} castShadow>
        <capsuleGeometry args={[0.036, 0.19, 6, 14]} />
        {skin}
      </mesh>
      <mesh position={[0.275, 1.045, 0.075]} scale={[1, 1.25, 0.6]} castShadow>
        <sphereGeometry args={[0.043, 14, 12]} />
        {skin}
      </mesh>

      <mesh position={[-0.175, 1.325, 0.01]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.041, 0.2, 6, 14]} />
        {silk}
      </mesh>
      <mesh position={[-0.222, 1.145, 0.05]} rotation={[0.3, 0, 0.5]} castShadow>
        <capsuleGeometry args={[0.036, 0.19, 6, 14]} />
        {skin}
      </mesh>
      <mesh position={[-0.25, 1.04, 0.1]} scale={[1, 1.25, 0.6]} castShadow>
        <sphereGeometry args={[0.043, 14, 12]} />
        {skin}
      </mesh>

      {/* an egg-shaped skull rather than a ball */}
      <mesh position={[0, 1.635, -0.004]} scale={[0.94, 1.14, 1]} castShadow>
        <sphereGeometry args={[0.098, 28, 22]} />
        {skin}
      </mesh>
      {/* hair sweeping back into a low chignon */}
      <mesh position={[0, 1.648, -0.016]} scale={[1, 1.1, 1.02]} castShadow>
        <sphereGeometry args={[0.105, 28, 22]} />
        <meshStandardMaterial color={PALETTE.hair} roughness={0.46} />
      </mesh>
      <mesh position={[0, 1.552, -0.086]} scale={[1.1, 0.9, 1]} castShadow>
        <sphereGeometry args={[0.068, 20, 16]} />
        <meshStandardMaterial color={PALETTE.hair} roughness={0.46} />
      </mesh>

      {/* her bouquet, now autumn */}
      <group position={[-0.27, 0.99, 0.12]} rotation={[0.3, 0, 0.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.098, 16, 14]} />
          <meshStandardMaterial color="#d98a3c" roughness={0.76} />
        </mesh>
        <mesh position={[0.035, 0.05, 0.03]}>
          <sphereGeometry args={[0.062, 14, 12]} />
          <meshStandardMaterial color="#c4551f" roughness={0.76} />
        </mesh>
        <mesh position={[-0.045, 0.035, -0.02]}>
          <sphereGeometry args={[0.058, 14, 12]} />
          <meshStandardMaterial color="#e5b453" roughness={0.8} />
        </mesh>
        <mesh position={[0.01, -0.02, 0.06]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#8d7a2c" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

function Groom() {
  /* the jacket is lathed too, so it has shoulders, a waist and a skirt */
  const jacket = useMemo(() => {
    const pts = [
      [0.235, 0.0], [0.245, 0.06], [0.243, 0.16], [0.232, 0.28], [0.224, 0.4],
      [0.228, 0.5], [0.242, 0.58], [0.252, 0.64], [0.243, 0.7], [0.21, 0.745],
      [0.15, 0.775], [0.09, 0.79],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])

  const wool = <meshStandardMaterial color={PALETTE.suit} roughness={0.68} sheen={0.35} sheenColor="#7286ad" />
  const skin = <meshStandardMaterial color={PALETTE.skin} roughness={0.72} />

  return (
    <group>
      {/* trousers with a slight taper */}
      {[-0.085, 0.085].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} rotation={[0, 0, x > 0 ? -0.018 : 0.018]} castShadow>
          <capsuleGeometry args={[0.069, 0.66, 6, 14]} />
          <meshStandardMaterial color="#1f2942" roughness={0.72} />
        </mesh>
      ))}
      {[-0.085, 0.085].map((x) => (
        <mesh key={`s${x}`} position={[x, 0.032, 0.045]} scale={[1, 0.5, 1.9]} castShadow>
          <sphereGeometry args={[0.068, 16, 12]} />
          <meshStandardMaterial color="#161c2e" roughness={0.32} metalness={0.18} />
        </mesh>
      ))}

      {/* body */}
      <mesh geometry={jacket} position={[0, 0.78, 0]} castShadow receiveShadow>{wool}</mesh>
      {/* shoulder line */}
      <mesh position={[0, 1.5, 0]} scale={[1.16, 0.44, 0.82]} castShadow>
        <sphereGeometry args={[0.208, 26, 18]} />
        {wool}
      </mesh>
      {/* shirt and collar */}
      <mesh position={[0, 1.5, 0.075]} rotation={[0.12, 0, 0]}>
        <cylinderGeometry args={[0.058, 0.07, 0.13, 14]} />
        <meshStandardMaterial color="#f7f2e6" roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.53, 0]} rotation={[0.05, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.068, 0.1, 16]} />
        {skin}
      </mesh>

      {/* arms, bent at the elbow */}
      <mesh position={[-0.2, 1.335, 0.015]} rotation={[0, 0, 0.26]} castShadow>
        <capsuleGeometry args={[0.05, 0.22, 6, 14]} />
        {wool}
      </mesh>
      <mesh position={[-0.252, 1.145, 0.06]} rotation={[0.3, 0, 0.46]} castShadow>
        <capsuleGeometry args={[0.045, 0.2, 6, 14]} />
        {wool}
      </mesh>
      <mesh position={[-0.285, 1.035, 0.115]} scale={[1, 1.2, 0.62]} castShadow>
        <sphereGeometry args={[0.046, 14, 12]} />
        {skin}
      </mesh>

      <mesh position={[0.205, 1.335, 0.01]} rotation={[0, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.05, 0.22, 6, 14]} />
        {wool}
      </mesh>
      <mesh position={[0.243, 1.15, 0.035]} rotation={[0.18, 0, -0.34]} castShadow>
        <capsuleGeometry args={[0.045, 0.2, 6, 14]} />
        {wool}
      </mesh>
      <mesh position={[0.268, 1.045, 0.07]} scale={[1, 1.2, 0.62]} castShadow>
        <sphereGeometry args={[0.046, 14, 12]} />
        {skin}
      </mesh>

      {/* head: taller than it is wide, with a jaw */}
      <mesh position={[0, 1.655, -0.004]} scale={[0.93, 1.15, 1]} castShadow>
        <sphereGeometry args={[0.098, 28, 22]} />
        {skin}
      </mesh>
      <mesh position={[0, 1.615, 0.012]} scale={[0.86, 0.78, 0.95]} castShadow>
        <sphereGeometry args={[0.09, 20, 16]} />
        {skin}
      </mesh>
      {/* short hair sitting on the back and crown */}
      <mesh position={[0, 1.678, -0.014]} scale={[1.02, 1.02, 1.02]} castShadow>
        <sphereGeometry args={[0.102, 26, 20]} />
        <meshStandardMaterial color={PALETTE.hair} roughness={0.46} />
      </mesh>
      <mesh position={[0, 1.63, -0.055]} scale={[1, 0.86, 0.7]} castShadow>
        <sphereGeometry args={[0.086, 20, 16]} />
        <meshStandardMaterial color={PALETTE.hair} roughness={0.46} />
      </mesh>
    </group>
  )
}

function Couple({ progress, maps, report }) {
  const group = useRef()
  const bride = useRef()
  const groom = useRef()
  const prev = useRef(new THREE.Vector3())

  useFrame((state, dt) => {
    const t = progress.current
    const u = THREE.MathUtils.clamp(0.17 + t * 0.75, 0, 0.995)
    const p = PATH.getPointAt(u)
    const tan = PATH.getTangentAt(u)
    group.current.position.set(p.x, 0, p.z)
    group.current.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI

    // hand the leaves their position and how briskly they are moving
    if (report) {
      report.current.p.set(p.x, 0, p.z)
      const d = Math.max(dt, 0.0001)
      // a flung scroll must not read as a gale — clamp the pace, then
      // ease toward it so one spiked frame cannot launch anything
      const raw = Math.min(report.current.p.distanceTo(prev.current) / d, 1.6)
      report.current.speed += (raw - report.current.speed) * Math.min(1, d * 5)
      prev.current.copy(report.current.p)
    }

    const moving = THREE.MathUtils.smoothstep(t, 0.02, 0.12)
    const w = state.clock.elapsedTime * 2.1
    bride.current.position.y = Math.abs(Math.sin(w)) * 0.018 * moving
    bride.current.rotation.z = Math.sin(w) * 0.012 * moving
    groom.current.position.y = Math.abs(Math.sin(w + Math.PI)) * 0.022 * moving
    groom.current.rotation.z = Math.sin(w + Math.PI) * 0.014 * moving
  })

  return (
    <group ref={group}>
      <group ref={bride} position={[-0.28, 0, 0]}>
        <Bride maps={maps} />
      </group>
      <group ref={groom} position={[0.3, 0, 0.02]}>
        <Groom />
      </group>
    </group>
  )
}

/* ===================================================================== */
function Drift({ progress, count, tex, palette, size, fall, isFlower }) {
  const ref = useRef()
  const bits = useMemo(() => {
    const rnd = seeded(isFlower ? 3141 : 2718)
    return Array.from({ length: count }, () => ({
      x: (rnd() - 0.5) * 36,
      y: rnd() * 17,
      z: rnd() * -78 + 14,
      fall: fall * (0.75 + rnd() * 0.5),
      sway: rnd() * Math.PI * 2,
      amp: 0.5 + rnd() * 0.9,
      s: size * (0.8 + rnd() * 0.5),
      rx: rnd() * Math.PI * 2,
      ry: rnd() * Math.PI * 2,
      rz: rnd() * Math.PI * 2,
      spinX: (rnd() - 0.5) * 0.7,
      spinY: (rnd() - 0.5) * 0.5,
      spinZ: (rnd() - 0.5) * 0.6,
      tint: (rnd() * palette.length) | 0,
    }))
  }, [count, palette, size, fall, isFlower])

  useLayoutEffect(() => {
    bits.forEach((l, i) => {
      C.set(palette[l.tint])
      ref.current.setColorAt(i, C)
    })
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [bits, palette])

  useFrame((st, dt) => {
    const d = Math.min(dt, 0.05)
    const time = st.clock.elapsedTime
    const anchor = PATH.getPointAt(THREE.MathUtils.clamp(progress.current * 0.55, 0, 1))
    const gust = WIND.gust
    bits.forEach((l, i) => {
      l.y -= l.fall * d
      l.x += WIND.x * gust * 0.3 * d
      l.z += WIND.z * gust * 0.3 * d
      if (l.y < -1.2) {
        l.y = 14 + Math.random() * 5
        l.x = (Math.random() - 0.5) * 36
        l.z = Math.random() * -78 + 14
      }
      l.rx += l.spinX * d
      l.ry += l.spinY * d
      l.rz += l.spinZ * d
      // a slow, wide scull rather than a tumble
      const swayX = Math.sin(time * 0.85 + l.sway) * l.amp * 0.5
      const swayZ = Math.cos(time * 0.66 + l.sway) * l.amp * 0.3
      E.set(l.rx, l.ry, l.rz)
      Q.setFromEuler(E)
      S.set(l.s, l.s, l.s)
      M.compose(V.set(anchor.x + l.x + swayX, l.y, anchor.z + l.z + swayZ), Q, S)
      ref.current.setMatrixAt(i, M)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <planeGeometry args={[1, isFlower ? 1 : 1.05]} />
      <meshStandardMaterial map={tex} alphaTest={0.42} side={THREE.DoubleSide} roughness={0.8} />
    </instancedMesh>
  )
}

/* =====================================================================
   THE BORDERS — deep planted beds running the length of the aisle:
   a strip of lawn, a cobble kerb, then mounds of massed flowers.

   The trick that makes it read as a planted border rather than
   confetti is that colour runs in bands along the path — a stretch of
   crimson, then white, then gold — the way a gardener actually plants.
   ===================================================================== */
const BED = [
  '#c62b2b', '#e8548f', '#fbf5ea', '#f2d05a', '#e8892c',
  '#8d5bc0', '#bf1f5e', '#ef6a48', '#b79ae0', '#f6a8c0',
  '#d9432f', '#fff2d0',
]

function Verge({ blossom, quality }) {
  const counts =
    quality === 'low'
      ? { mounds: 320, heads: 3000, cobbles: 190 }
      : quality === 'mid'
        ? { mounds: 640, heads: 5800, cobbles: 320 }
        : { mounds: 1020, heads: 9500, cobbles: 520 }

  /* the mounds of foliage the flowers sit on */
  const beds = useMemo(() => {
    const rnd = seeded(8642)
    const out = []
    for (let i = 0; i < counts.mounds; i++) {
      const u = rnd() * 0.985
      const p = PATH.getPointAt(u)
      const t = PATH.getTangentAt(u)
      const n = new THREE.Vector3().crossVectors(UP, t).normalize()
      const taper = 1 - u * 0.32
      const side = rnd() > 0.5 ? 1 : -1
      const lawn = 1.5 * (1 - u * 0.34) + 0.75          // stones, then a strip of grass
      // the bed itself, deepest nearest the kerb
      const off = side * (lawn + 0.2 + Math.pow(rnd(), 0.85) * 4.3)
      const r = (0.26 + rnd() * 0.22) * taper
      out.push({
        x: p.x + n.x * off + (rnd() - 0.5) * 0.5,
        z: p.z + n.z * off + (rnd() - 0.5) * 0.5,
        r,
        h: r * (0.42 + rnd() * 0.2),
        rot: rnd() * Math.PI,
        // colour is decided by where along the path it sits, not at random
        band: Math.floor(u * 17 + (side > 0 ? 5 : 0)),
        jitter: rnd(),
      })
    }
    return out
  }, [counts.mounds])

  /* flower heads scattered over the upper surface of each mound */
  const heads = useMemo(() => {
    const rnd = seeded(1357)
    const out = []
    const per = Math.max(2, Math.round(counts.heads / beds.length))
    beds.forEach((b) => {
      const tone = BED[b.band % BED.length]
      for (let k = 0; k < per; k++) {
        const a = rnd() * Math.PI * 2
        // spread over the whole dome so the mound disappears under bloom
        const e = Math.pow(rnd(), 0.72)
        const rr = Math.sin((e * Math.PI) / 2) * b.r * 1.06
        const yy = Math.cos((e * Math.PI) / 2) * b.h * 1.25
        out.push({
          x: b.x + Math.cos(a) * rr,
          z: b.z + Math.sin(a) * rr,
          y: yy + 0.035,
          s: 0.185 + rnd() * 0.115,
          // blooms on the shoulder of the mound face outwards
          tiltX: -1.45 + e * 1.15 + (rnd() - 0.5) * 0.3,
          rotY: a + (rnd() - 0.5) * 0.5,
          tone,
          // a few blooms in each bed drift off the band colour
          stray: rnd() > 0.88 ? (rnd() * BED.length) | 0 : -1,
          shade: 0.86 + rnd() * 0.24,
        })
      }
    })
    return out
  }, [beds, counts.heads])

  /* a kerb of river cobbles between the lawn and the bed */
  const cobbles = useMemo(() => {
    const rnd = seeded(2024)
    const out = []
    const N = Math.round(counts.cobbles / 2)
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 0.985
      const p = PATH.getPointAt(u)
      const t = PATH.getTangentAt(u)
      const n = new THREE.Vector3().crossVectors(UP, t).normalize()
      const taper = 1 - u * 0.32
      const lawn = 1.5 * (1 - u * 0.34) + 0.75
      for (const side of [-1, 1]) {
        out.push({
          x: p.x + n.x * side * lawn + (rnd() - 0.5) * 0.1,
          z: p.z + n.z * side * lawn + (rnd() - 0.5) * 0.1,
          w: (0.15 + rnd() * 0.09) * taper,
          h: (0.075 + rnd() * 0.04) * taper,
          rot: rnd() * Math.PI,
          pale: rnd(),
        })
      }
    }
    return out
  }, [counts.cobbles])

  const moundRef = useRef()
  const headRef = useRef()
  const cobbleRef = useRef()

  useLayoutEffect(() => {
    beds.forEach((b, i) => {
      E.set(0, b.rot, 0)
      Q.setFromEuler(E)
      S.set(b.r, b.h, b.r * 0.92)
      M.compose(V.set(b.x, b.h * 0.42, b.z), Q, S)
      moundRef.current.setMatrixAt(i, M)
      C.setHSL(0.28 - b.jitter * 0.05, 0.3 + b.jitter * 0.1, 0.075 + b.jitter * 0.035)
      moundRef.current.setColorAt(i, C)
    })
    moundRef.current.instanceMatrix.needsUpdate = true
    if (moundRef.current.instanceColor) moundRef.current.instanceColor.needsUpdate = true

    heads.forEach((f, i) => {
      E.set(f.tiltX, f.rotY, 0)
      Q.setFromEuler(E)
      S.set(f.s, f.s, f.s)
      M.compose(V.set(f.x, f.y, f.z), Q, S)
      headRef.current.setMatrixAt(i, M)
      C.set(f.stray >= 0 ? BED[f.stray] : f.tone)
      C.multiplyScalar(f.shade)
      headRef.current.setColorAt(i, C)
    })
    headRef.current.instanceMatrix.needsUpdate = true
    if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true

    cobbles.forEach((c, i) => {
      E.set(0, c.rot, 0)
      Q.setFromEuler(E)
      S.set(c.w, c.h, c.w * 0.78)
      M.compose(V.set(c.x, c.h * 0.5, c.z), Q, S)
      cobbleRef.current.setMatrixAt(i, M)
      const v = 0.62 + c.pale * 0.3
      C.setRGB(v, v * 0.96, v * 0.88)
      cobbleRef.current.setColorAt(i, C)
    })
    cobbleRef.current.instanceMatrix.needsUpdate = true
    if (cobbleRef.current.instanceColor) cobbleRef.current.instanceColor.needsUpdate = true
  }, [beds, heads, cobbles])

  const cast = quality !== 'low'
  return (
    <group>
      <instancedMesh ref={moundRef} args={[null, null, beds.length]} castShadow={cast} receiveShadow>
        <sphereGeometry args={[1, 9, 7]} />
        <meshStandardMaterial roughness={0.98} />
      </instancedMesh>
      <instancedMesh ref={cobbleRef} args={[null, null, cobbles.length]} receiveShadow castShadow={cast}>
        <sphereGeometry args={[1, 9, 7]} />
        <meshStandardMaterial roughness={0.86} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[null, null, heads.length]} castShadow={quality === 'high'}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={blossom} alphaTest={0.4} side={THREE.DoubleSide} roughness={0.8} />
      </instancedMesh>
    </group>
  )
}

/* =====================================================================
   THE MEADOW — the beds hold the path, but the fields either side are
   flowering too, in drifts rather than an even sprinkle.
   ===================================================================== */
const MEADOW = [
  '#f2d05a', '#ffffff', '#e8892c', '#e8548f', '#c9d8ff',
  '#b79ae0', '#fbf5ea', '#f6a8c0', '#ef6a48', '#ffe9b8',
  '#d9432f', '#8d5bc0',
]

function Meadow({ blossom, quality }) {
  const count = quality === 'low' ? 16000 : quality === 'mid' ? 38000 : 70000

  const heads = useMemo(() => {
    const rnd = seeded(31415)
    // a coarse sample of the aisle, so we can keep clear of it cheaply
    const spine = []
    for (let i = 0; i <= 150; i++) spine.push(PATH.getPointAt(i / 150))
    const nearPath = (x, z) => {
      let best = 1e9
      for (let i = 0; i < spine.length; i++) {
        const dx = x - spine[i].x
        const dz = z - spine[i].z
        const d = dx * dx + dz * dz
        if (d < best) best = d
      }
      return best
    }

    /* Flowers come in drifts, not an even sprinkle — scatter patches
       first, then fill each one. */
    const PER = 140
    const want = Math.round(count / PER)
    const patches = []
    let guard = 0
    while (patches.length < want && guard < want * 30) {
      guard++
      const x = (rnd() - 0.5) * 124
      const z = 30 - rnd() * 186
      const near = nearPath(x, z)
      if (near < 64) continue                                   // the beds already hold this
      if (Math.abs(x - CHURCH.x) < 23 && z < CHURCH.z + 19 && z > CHURCH.z - 24) continue
      // thin out gently towards the far edges so it never looks tiled
      if (rnd() > 0.99 - Math.min(0.55, Math.sqrt(near) / 150)) continue
      patches.push({
        x,
        z,
        r: 1.7 + rnd() * 3.7,
        tone: MEADOW[(rnd() * MEADOW.length) | 0],
        mix: MEADOW[(rnd() * MEADOW.length) | 0],
      })
    }

    const out = []
    patches.forEach((c) => {
      for (let k = 0; k < PER; k++) {
        const a = rnd() * Math.PI * 2
        const rr = Math.sqrt(rnd()) * c.r
        const x = c.x + Math.cos(a) * rr
        const z = c.z + Math.sin(a) * rr
        out.push({
          x,
          z,
          y: 0.1 + rnd() * 0.2,
          s: 0.19 + rnd() * 0.17,
          tiltX: -1.5 + rnd() * 0.8,
          rotY: rnd() * Math.PI * 2,
          // mostly the drift colour, with a second shade running through it
          tone: rnd() > 0.26 ? c.tone : c.mix,
          shade: 0.8 + rnd() * 0.34,
        })
      }
    })
    return out
  }, [count])

  const ref = useRef()
  useLayoutEffect(() => {
    heads.forEach((f, i) => {
      E.set(f.tiltX, f.rotY, 0)
      Q.setFromEuler(E)
      S.set(f.s, f.s, f.s)
      M.compose(V.set(f.x, f.y, f.z), Q, S)
      ref.current.setMatrixAt(i, M)
      C.set(f.tone)
      C.multiplyScalar(f.shade)
      ref.current.setColorAt(i, C)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [heads])

  return (
    <instancedMesh ref={ref} args={[null, null, heads.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={blossom} alphaTest={0.4} side={THREE.DoubleSide} roughness={0.85} />
    </instancedMesh>
  )
}

/* =====================================================================
   DRIFTED LEAVES — they lie along the aisle until the couple walk
   through them, then they are kicked up, caught by the wind, and
   tumble back down to settle somewhere new.
   ===================================================================== */
function GroundLeaves({ couple, count, tex, quality }) {
  const ref = useRef()

  const leaves = useMemo(() => {
    const rnd = seeded(5150)
    const out = []
    for (let i = 0; i < count; i++) {
      const u = rnd() * 0.99
      const p = PATH.getPointAt(u)
      const t = PATH.getTangentAt(u)
      const n = new THREE.Vector3().crossVectors(UP, t).normalize()
      // thickest on the path, thinning out into the grass either side
      const off = (rnd() * 2 - 1) * (0.4 + Math.pow(rnd(), 0.85) * 3.6)
      out.push({
        x: p.x + n.x * off + (rnd() - 0.5) * 1.2,
        y: 0.035,
        z: p.z + n.z * off + (rnd() - 0.5) * 1.2,
        vx: 0, vy: 0, vz: 0,
        rx: -Math.PI / 2 + (rnd() - 0.5) * 0.4,
        ry: rnd() * Math.PI * 2,
        rz: (rnd() - 0.5) * 0.4,
        wx: 0, wy: 0, wz: 0,
        s: 0.2 + rnd() * 0.16,
        seed: rnd(),
        tint: (rnd() * AUTUMN.length) | 0,
        rest: true,
      })
    }
    return out
  }, [count])

  useLayoutEffect(() => {
    leaves.forEach((l, i) => {
      C.set(AUTUMN[l.tint])
      ref.current.setColorAt(i, C)
    })
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [leaves])

  useFrame((st, dt) => {
    const d = Math.min(dt, 0.04)
    const time = st.clock.elapsedTime
    const cx = couple.current.p.x
    const cz = couple.current.p.z
    const stride = couple.current.speed
    const gust = WIND.gust
    const wx = WIND.x * gust
    const wz = WIND.z * gust
    const REACH = 2.0

    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i]

      // --- disturbed by the couple passing ---
      const dx = l.x - cx
      const dz = l.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 < REACH * REACH && stride > 0.03) {
        const dist = Math.sqrt(d2) + 0.0001
        // a soft push, as if a breeze came with them
        const force = (1 - dist / REACH) * Math.min(stride * 0.34, 0.4)
        const nx = dx / dist
        const nz = dz / dist
        l.vx += nx * force * 0.85 + (Math.random() - 0.5) * 0.14
        l.vz += nz * force * 0.85 + (Math.random() - 0.5) * 0.14
        l.vy += force * 0.95 + Math.random() * 0.18
        l.wx += (Math.random() - 0.5) * force * 3.2
        l.wy += (Math.random() - 0.5) * force * 3.2
        l.wz += (Math.random() - 0.5) * force * 3.2
        l.rest = false
      }

      // --- a strong enough gust lifts a settled leaf on its own ---
      if (l.rest && gust > 1.18 && Math.sin(time * 0.9 + l.seed * 31) > 0.9965) {
        l.vy = 0.24 + Math.random() * 0.2
        l.vx = wx * 0.5
        l.vz = wz * 0.5
        l.wy = (Math.random() - 0.5) * 2
        l.rest = false
      }

      if (!l.rest) {
        l.vy -= 3.4 * d                       // a leaf barely weighs anything
        l.vx += (wx * 0.5 - l.vx) * 2.2 * d   // air resistance bleeds speed off fast
        l.vz += (wz * 0.5 - l.vz) * 2.2 * d
        l.vx += Math.sin(time * 3.2 + l.seed * 19) * 0.16 * d  // flutter
        l.vz += Math.cos(time * 2.6 + l.seed * 23) * 0.13 * d
        l.vy *= 0.965
        // nothing is allowed to travel quickly, however hard you scroll
        const cap = 0.85
        if (l.vx > cap) l.vx = cap
        if (l.vx < -cap) l.vx = -cap
        if (l.vz > cap) l.vz = cap
        if (l.vz < -cap) l.vz = -cap
        if (l.vy > 0.7) l.vy = 0.7

        l.x += l.vx * d
        l.y += l.vy * d
        l.z += l.vz * d
        l.rx += l.wx * d
        l.ry += l.wy * d
        l.rz += l.wz * d
        l.wx *= 0.94
        l.wy *= 0.94
        l.wz *= 0.94

        if (l.y <= 0.035) {
          l.y = 0.035
          l.vy = 0
          l.vx *= 0.5                          // skids a little on landing
          l.vz *= 0.5
          if (Math.abs(l.vx) + Math.abs(l.vz) < 0.12) {
            l.rest = true
            l.vx = l.vz = 0
            l.wx = l.wy = l.wz = 0
            l.rx = -Math.PI / 2 + (l.seed - 0.5) * 0.4
            l.rz = (l.seed - 0.5) * 0.4
          }
        }
      }

      E.set(l.rx, l.ry, l.rz)
      Q.setFromEuler(E)
      S.set(l.s, l.s, l.s)
      M.compose(V.set(l.x, l.y, l.z), Q, S)
      ref.current.setMatrixAt(i, M)
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (typeof window !== 'undefined') window.__airborne = leaves.reduce((n, l) => n + (l.rest ? 0 : 1), 0)
  })

  return (
    <instancedMesh
      ref={ref}
      args={[null, null, count]}
      frustumCulled={false}
      receiveShadow
      castShadow={quality === 'high'}
    >
      <planeGeometry args={[1, 1.05]} />
      <meshStandardMaterial map={tex} alphaTest={0.42} side={THREE.DoubleSide} roughness={0.86} />
    </instancedMesh>
  )
}

/* =====================================================================
   FIREWORKS over the church — shells climb from the grounds, hang, and
   break into a sphere of sparks that falls away under gravity.
   ===================================================================== */
const FW_TINT = ['#ff3b6b', '#ffd33d', '#ff7a1f', '#c869ff', '#39d7ff', '#fff0b8', '#ff5ec4', '#7cff8a']

function SkyFireworks({ quality }) {
  const MAX = quality === 'low' ? 220 : quality === 'mid' ? 380 : 560
  const BURST = quality === 'low' ? 34 : quality === 'mid' ? 52 : 72
  const tex = useMemo(() => sparkTexture(), [])
  const { camera } = useThree()
  const ref = useRef()

  const store = useMemo(() => {
    const parts = []
    for (let i = 0; i < MAX; i++) {
      parts.push({ live: false, shell: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, decay: 0, size: 0, fuse: 0, col: '#fff' })
    }
    return { parts, next: 1.2, seed: seeded(606) }
  }, [MAX])

  useFrame((st, dt) => {
    const d = Math.min(dt, 0.05)
    const parts = store.parts
    const rnd = store.seed

    const free = () => {
      for (let i = 0; i < parts.length; i++) if (!parts[i].live) return parts[i]
      return null
    }

    /* send one up now and then */
    store.next -= d
    if (store.next <= 0) {
      store.next = 0.7 + rnd() * 1.6
      const p = free()
      if (p) {
        p.live = true
        p.shell = true
        p.x = CHURCH.x + (rnd() - 0.5) * 150
        p.y = 2.0
        p.z = CHURCH.z - 34 - rnd() * 110
        p.vx = (rnd() - 0.5) * 1.6
        p.vy = 21 + rnd() * 7
        p.vz = (rnd() - 0.5) * 1.6
        p.fuse = 1.7 + rnd() * 0.6
        p.life = 1
        p.size = 1.7
        p.col = FW_TINT[(rnd() * FW_TINT.length) | 0]
      }
    }

    const explode = (at) => {
      const power = 19 + rnd() * 11
      for (let k = 0; k < BURST; k++) {
        const q = free()
        if (!q) return
        // an even sphere of sparks
        const th = rnd() * Math.PI * 2
        const ph = Math.acos(rnd() * 2 - 1)
        const sp = power * (0.55 + rnd() * 0.6)
        q.live = true
        q.shell = false
        q.x = at.x
        q.y = at.y
        q.z = at.z
        q.vx = Math.sin(ph) * Math.cos(th) * sp
        q.vy = Math.cos(ph) * sp
        q.vz = Math.sin(ph) * Math.sin(th) * sp
        q.life = 1
        q.decay = 0.34 + rnd() * 0.2
        q.size = 1.7 + rnd() * 1.4
        q.col = rnd() > 0.22 ? at.col : '#fffaf0'
      }
    }

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (!p.live) {
        S.set(0, 0, 0)
        M.compose(V.set(0, -999, 0), camera.quaternion, S)
        ref.current.setMatrixAt(i, M)
        continue
      }

      if (p.shell) {
        p.vy -= 9.4 * d
        p.x += p.vx * d
        p.y += p.vy * d
        p.z += p.vz * d
        p.fuse -= d
        if (p.fuse <= 0 || p.vy <= 0) {
          p.live = false
          explode(p)
          continue
        }
      } else {
        p.vy -= 4.6 * d
        p.vx *= 1 - 0.62 * d
        p.vy *= 1 - 0.34 * d
        p.vz *= 1 - 0.62 * d
        p.x += p.vx * d
        p.y += p.vy * d
        p.z += p.vz * d
        p.life -= p.decay * d
        if (p.life <= 0 || p.y < 0) {
          p.live = false
          continue
        }
      }

      const sc = p.shell ? p.size : p.size * (0.35 + p.life * 0.85)
      S.set(sc, sc, sc)
      M.compose(V.set(p.x, p.y, p.z), camera.quaternion, S)
      ref.current.setMatrixAt(i, M)
      C.set(p.col)
      // sparks cool as they die
      C.multiplyScalar(p.shell ? 1.9 : 0.9 + p.life * 1.1)
      ref.current.setColorAt(i, C)
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX]} frustumCulled={false} renderOrder={3}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

/* ===================================================================== */
function CameraRig({ progress }) {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 3.5, -20))
  useFrame((state, delta) => {
    const t = progress.current
    const u = THREE.MathUtils.clamp(t * 0.55, 0, 0.995)
    const p = PATH.getPointAt(u)
    const tan = PATH.getTangentAt(u)
    const height = 2.75 + t * t * 1.7
    V2.set(p.x - tan.x * 0.6, height, p.z - tan.z * 0.6)
    const ahead = PATH.getPointAt(Math.min(u + 0.13, 1))
    V.set(ahead.x, 3.5, ahead.z)
    V.lerp(new THREE.Vector3(CHURCH.x, 6.4 + t * 1.4, CHURCH.z + 11), THREE.MathUtils.smoothstep(t, 0.3, 0.94))
    const k = 1 - Math.pow(0.0009, delta)
    camera.position.lerp(V2, k)
    look.current.lerp(V, k)
    camera.lookAt(look.current)
  })
  return null
}

/* ===================================================================== */
function Wind() {
  /* one clock the canopy shader and the leaf physics both read */
  useFrame((st) => {
    const t = st.clock.elapsedTime
    WIND.time.value = t
    WIND.gust = 0.75 + 0.45 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.61 + 1.3)
    WIND.x = 0.5 + 0.22 * Math.sin(t * 0.17)
    WIND.z = -0.18 + 0.14 * Math.cos(t * 0.13)
  })
  return null
}

export default function Scene({ progress, quality }) {
  const { gl } = useThree()
  const maps = useMemo(() => buildMaps(), [])
  const leafTex = useMemo(() => leafTexture(), [])
  const blossomTex = useMemo(() => blossomTexture(), [])
  const skyMat = useMemo(() => makeSkyMaterial(), [])
  const sun = useMemo(() => SUN_DIR.clone().multiplyScalar(-90), [])
  const coupleAt = useRef({ p: new THREE.Vector3(), speed: 0 })
  const drifted = quality === 'low' ? 260 : quality === 'mid' ? 520 : 860
  // mostly blossom in the air, with a scatter of leaves through it
  const airFlowers = quality === 'low' ? 55 : quality === 'mid' ? 100 : 150
  const airLeaves = quality === 'low' ? 18 : quality === 'mid' ? 30 : 46

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.04
  }, [gl])

  return (
    <>
      <fogExp2 attach="fog" args={[PALETTE.fog, 0.0058]} />
      <SkyDome material={skyMat} />
      <SkyEnvironment material={skyMat} />
      <Atmosphere />

      <hemisphereLight args={['#ffe2b0', '#8a7c46', 0.6]} />
      <directionalLight
        position={[sun.x, 26, sun.z]}
        intensity={3.1}
        color="#ffd39a"
        castShadow
        shadow-mapSize={
          quality === 'low' ? [1024, 1024] : quality === 'mid' ? [1536, 1536] : [2048, 2048]
        }
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0009}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-18, 12, 26]} intensity={0.34} color="#aec9e8" />

      <Wind />
      <Ground maps={maps} quality={quality} />
      <Trees maps={maps} quality={quality} />
      <Church maps={maps} quality={quality} />
      {/* Couple is mounted first so it writes its position before the
          leaves read it in the same frame */}
      <Couple progress={progress} maps={maps} report={coupleAt} />
      <Verge blossom={blossomTex} quality={quality} />
      <Meadow blossom={blossomTex} quality={quality} />
      <GroundLeaves couple={coupleAt} count={drifted} tex={leafTex} quality={quality} />
      <Drift progress={progress} count={airFlowers} tex={blossomTex} palette={BLOOMS} size={0.15} fall={0.3} isFlower />
      <Drift progress={progress} count={airLeaves} tex={leafTex} palette={AUTUMN} size={0.16} fall={0.38} />
      <SkyFireworks quality={quality} />

      <CameraRig progress={progress} />
    </>
  )
}
