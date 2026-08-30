import * as THREE from 'three'

/* ---------------------------------------------------------------
   Procedural surface detail. No image files to download — every map
   is generated once into a canvas at start-up, which is what stops
   the materials reading as flat plastic.
   --------------------------------------------------------------- */

function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2246822519
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function vnoise(x, y, seed) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x, y, oct, seed, period) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let o = 0; o < oct; o++) {
    const p = period * f
    sum += amp * vnoise((((x * f) % p) + p) % p, (((y * f) % p) + p) % p, seed + o * 71)
    amp *= 0.5
    f *= 2
  }
  return sum
}

function field(size, oct, period, seed) {
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[y * size + x] = fbm((x / size) * period, (y / size) * period, oct, seed, period)
    }
  }
  return out
}

function canvasTexture(size, paint, repeat) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  paint(img.data, size)
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  return t
}

function normalTexture(h, size, strength, repeat) {
  return canvasTexture(
    size,
    (d) => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const l = h[y * size + ((x - 1 + size) % size)]
          const r = h[y * size + ((x + 1) % size)]
          const u = h[((y - 1 + size) % size) * size + x]
          const dn = h[((y + 1) % size) * size + x]
          const nx = (l - r) * strength
          const ny = (u - dn) * strength
          const len = Math.hypot(nx, ny, 1)
          const i = (y * size + x) * 4
          d[i] = ((nx / len) * 0.5 + 0.5) * 255
          d[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
          d[i + 2] = (1 / len) * 0.5 * 255 + 127.5
          d[i + 3] = 255
        }
      }
    },
    repeat
  )
}

const mix = (a, b, t) => a + (b - a) * t

/* one leaf blade with a midrib and veins, white so it can be tinted */
export function leafTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')

  x.beginPath()
  x.moveTo(64, 8)
  x.bezierCurveTo(102, 30, 108, 76, 64, 120)
  x.bezierCurveTo(20, 76, 26, 30, 64, 8)
  x.closePath()
  x.fillStyle = '#ffffff'
  x.fill()

  // a little shading from tip to stem
  x.globalCompositeOperation = 'source-atop'
  const g = x.createLinearGradient(0, 8, 0, 120)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.55, 'rgba(238,238,238,1)')
  g.addColorStop(1, 'rgba(196,196,196,1)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)

  // midrib and veins
  x.strokeStyle = 'rgba(126,96,54,0.5)'
  x.lineWidth = 2.6
  x.beginPath()
  x.moveTo(64, 12)
  x.lineTo(64, 118)
  x.stroke()
  x.lineWidth = 1.3
  for (let i = 0; i < 5; i++) {
    const y = 26 + i * 17
    x.beginPath()
    x.moveTo(64, y)
    x.quadraticCurveTo(82, y + 5, 94, y + 18)
    x.stroke()
    x.beginPath()
    x.moveTo(64, y)
    x.quadraticCurveTo(46, y + 5, 34, y + 18)
    x.stroke()
  }
  x.globalCompositeOperation = 'source-over'

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* a soft six-petal blossom, white so each one can be tinted */
export function blossomTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const cx = 64
  const cy = 64

  x.fillStyle = '#ffffff'
  for (let i = 0; i < 6; i++) {
    x.save()
    x.translate(cx, cy)
    x.rotate((i / 6) * Math.PI * 2)
    x.beginPath()
    x.ellipse(0, -29, 17, 26, 0, 0, Math.PI * 2)
    x.fill()
    x.restore()
  }

  // petals a shade deeper where they meet the centre
  x.globalCompositeOperation = 'source-atop'
  const g = x.createRadialGradient(cx, cy, 4, cx, cy, 60)
  g.addColorStop(0, 'rgba(206,206,206,1)')
  g.addColorStop(0.4, 'rgba(244,244,244,1)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  x.globalCompositeOperation = 'source-over'

  x.beginPath()
  x.arc(cx, cy, 10.5, 0, Math.PI * 2)
  x.fillStyle = '#dcab41'
  x.fill()
  x.beginPath()
  x.arc(cx, cy, 5.5, 0, Math.PI * 2)
  x.fillStyle = '#b8862a'
  x.fill()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* a round glow for firework sparks */
export function sparkTexture() {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  // pure white so the instance colour comes through unshifted
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,1)')
  g.addColorStop(0.52, 'rgba(255,255,255,0.72)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function buildMaps() {
  const S = 256

  /* --- meadow in late October: olive going to straw, with leaf litter --- */
  const gBase = field(S, 4, 8, 11)
  const gClump = field(S, 2, 3, 907)
  const gLitter = field(S, 3, 26, 5511)
  const grassMap = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const n = gBase[i]
        const dry = Math.pow(gClump[i], 0.95)
        // olive-green base, bleaching to straw where it has dried off
        let r = mix(mix(142, 178, n), 214, dry)
        let g = mix(mix(140, 166, n), 174, dry)
        let b = mix(mix(70, 88, n), 92, dry)
        // fallen leaves scattered through it
        const lit = gLitter[i]
        if (lit > 0.55) {
          const k = Math.min((lit - 0.55) / 0.45, 1) * 0.9
          r = mix(r, 196, k)
          g = mix(g, 122, k)
          b = mix(b, 56, k)
        }
        const j = i * 4
        d[j] = r
        d[j + 1] = g
        d[j + 2] = b
        d[j + 3] = 255
      }
    },
    30
  )
  const grassNormal = normalTexture(gBase, S, 2.2, 30)

  /* --- flagstone --- */
  const sBase = field(S, 5, 14, 313)
  const sPit = field(S, 3, 40, 77)
  const stoneMap = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const n = sBase[i] * 0.75 + sPit[i] * 0.25
        const v = mix(186, 240, n)
        const j = i * 4
        d[j] = v
        d[j + 1] = v * 0.966
        d[j + 2] = v * 0.9
        d[j + 3] = 255
      }
    },
    2.4
  )
  const stoneNormal = normalTexture(sPit, S, 3.0, 2.4)
  const stoneRough = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const v = mix(200, 255, sBase[i])
        const j = i * 4
        d[j] = d[j + 1] = d[j + 2] = v
        d[j + 3] = 255
      }
    },
    2.4
  )

  /* --- lime plaster for the church walls --- */
  const pBase = field(S, 5, 10, 5150)
  const pFine = field(S, 3, 46, 22)
  const plasterMap = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const n = pBase[i] * 0.7 + pFine[i] * 0.3
        const v = mix(212, 250, n)
        const j = i * 4
        d[j] = v
        d[j + 1] = v * 0.958
        d[j + 2] = v * 0.884
        d[j + 3] = 255
      }
    },
    1.6
  )
  const plasterNormal = normalTexture(pFine, S, 1.9, 1.6)

  /* --- clay roof tiles in courses --- */
  const rGrain = field(S, 4, 22, 8080)
  const roofMap = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const y = Math.floor(i / size)
        const course = Math.sin((y / size) * Math.PI * 2 * 9)
        const v = mix(104, 150, rGrain[i]) + course * 9
        const j = i * 4
        d[j] = v * 1.14
        d[j + 1] = v * 0.87
        d[j + 2] = v * 0.7
        d[j + 3] = 255
      }
    },
    3
  )
  const roofNormal = normalTexture(rGrain, S, 2.4, 3)

  /* --- ivory silk for the gown --- */
  const kBase = field(S, 4, 12, 4141)
  const silkRough = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const v = mix(96, 178, kBase[i])
        const j = i * 4
        d[j] = d[j + 1] = d[j + 2] = v
        d[j + 3] = 255
      }
    },
    3
  )
  const silkNormal = normalTexture(kBase, S, 1.0, 3)

  /* --- bark --- */
  const bark = field(S, 4, 30, 606)
  const barkMap = canvasTexture(
    S,
    (d, size) => {
      for (let i = 0; i < size * size; i++) {
        const x = i % size
        const streak = Math.sin((x / size) * Math.PI * 2 * 22) * 0.5 + 0.5
        const n = bark[i] * 0.7 + streak * 0.3
        const v = mix(74, 132, n)
        const j = i * 4
        d[j] = v * 1.1
        d[j + 1] = v * 0.9
        d[j + 2] = v * 0.7
        d[j + 3] = 255
      }
    },
    2
  )
  const barkNormal = normalTexture(bark, S, 3.4, 2)

  return {
    grassMap, grassNormal,
    stoneMap, stoneNormal, stoneRough,
    plasterMap, plasterNormal,
    roofMap, roofNormal,
    silkRough, silkNormal,
    barkMap, barkNormal,
  }
}
