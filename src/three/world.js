import * as THREE from 'three'

/* deterministic randomness so every visitor sees the same meadow */
export function seeded(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* the aisle: a gentle S from the meadow up to the church door */
export const PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(2.4, 0, 18),
    new THREE.Vector3(1.2, 0, 8),
    new THREE.Vector3(-1.4, 0, -4),
    new THREE.Vector3(-2.4, 0, -18),
    new THREE.Vector3(-0.2, 0, -32),
    new THREE.Vector3(1.0, 0, -44),
    new THREE.Vector3(0.15, 0, -55),
  ],
  false,
  'catmullrom',
  0.5
)

/* the autumn palette the leaves are tinted from */
/* chrysanthemum, dahlia and marigold shades — an autumn wedding palette */
export const BLOOMS = ['#fbf3e2', '#f2ddae', '#e9a842', '#d9782c', '#bf4a2b', '#933040', '#e7c6d2', '#cf8fa6']

export const AUTUMN = ['#d2762b', '#c04f1e', '#e0a136', '#b5822a', '#9e3a1c', '#dba648', '#8d7a2c']

/* one shared wind clock, read by the tree shader and the leaf physics */
export const WIND = { time: { value: 0 }, x: 0.55, z: -0.18, gust: 1 }

export const CHURCH = new THREE.Vector3(0, 0, -67)
export const SUN_DIR = new THREE.Vector3(0.06, 0.15, -1).normalize()

export const PALETTE = {
  stone: '#f0e5cd',
  stoneDark: '#dccdac',
  roof: '#8a7154',
  wood: '#6a4a2c',
  glow: '#ffdda4',
  gown: '#fdf8ef',
  suit: '#2b3550',
  hair: '#2a1c14',
  skin: '#cf9a6c',
  grass: '#b3ac72',
  trunk: '#6b5138',
  fog: '#f7d3a2',
}

/* The sky is used twice: once as the visible dome, and once rendered
   into an environment map so every material is lit by it. */
export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#7ba7cf') },
      mid: { value: new THREE.Color('#f6dcac') },
      low: { value: new THREE.Color('#f8c68d') },
      hor: { value: new THREE.Color('#f2a97a') },
      sun: { value: new THREE.Color('#fff6dc') },
      sunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){
        vW = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform vec3 top, mid, low, hor, sun, sunDir;
      void main(){
        vec3 d = normalize(vW);
        float h = d.y * 0.5 + 0.5;
        vec3 c = mix(hor, low, smoothstep(0.455, 0.53, h));
        c = mix(c, mid, smoothstep(0.50, 0.63, h));
        c = mix(c, top, smoothstep(0.63, 0.97, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sun * pow(s, 320.0) * 3.2;
        c += sun * pow(s, 14.0) * 0.40;
        c += sun * pow(s, 3.0)  * 0.15;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

/* a soft round petal, drawn once into a canvas */
export function petalTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 30, 2, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,255,255,0.98)')
  g.addColorStop(0.55, 'rgba(255,240,218,0.85)')
  g.addColorStop(1, 'rgba(255,228,198,0)')
  x.fillStyle = g
  x.beginPath()
  x.ellipse(32, 32, 30, 19, 0, 0, Math.PI * 2)
  x.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* rolling meadow: flat along the aisle, undulating further out */
export function groundGeometry() {
  const g = new THREE.PlaneGeometry(460, 460, 90, 90)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const corridor = THREE.MathUtils.smoothstep(Math.abs(x), 7, 40)
    const h =
      Math.sin(x * 0.055) * 1.0 +
      Math.sin(y * 0.042) * 1.25 +
      Math.sin((x + y) * 0.028) * 0.8
    p.setZ(i, h * corridor * 1.5)
  }
  g.computeVertexNormals()
  return g
}

/* the flat ribbon of ground the stones are laid on */
export function pathRibbonGeometry(half = 1.5, seg = 160) {
  const pos = []
  const idx = []
  const n = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * 0.999
    const p = PATH.getPointAt(u)
    const t = PATH.getTangentAt(u)
    n.crossVectors(up, t).normalize()
    const w = half * (1 - u * 0.34)
    pos.push(p.x + n.x * w, 0.02, p.z + n.z * w)
    pos.push(p.x - n.x * w, 0.02, p.z - n.z * w)
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
