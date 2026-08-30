import { useEffect, useRef } from 'react'

/**
 * One shell out of the wax seal: it climbs the card and breaks in cream
 * high overhead, then the sparks drift down glittering. Runs for a few
 * seconds after the seal is broken and then removes itself.
 */
export default function Fireworks({ onDone, duration = 4200, origin }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w, h
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const K = Math.max(0.85, Math.min(w, h) / 620)
    const CREAM = ['#fff6e2', '#fdecc9', '#f7e2b6', '#fffaf0', '#f2dcb0']
    const shells = []
    const sparks = []
    const glitter = []
    const started = performance.now()
    let raf

    const burst = (x, y, tint) => {
      const pal = CREAM
      const n = 124 + ((Math.random() * 46) | 0)
      const power = 3.7 + Math.random() * 2.3
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.16
        const sp = power * (0.55 + Math.random() * 0.65)
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          decay: 0.008 + Math.random() * 0.011,
          tint: Math.random() < 0.5 ? tint : pal[(Math.random() * pal.length) | 0],
          size: (1.5 + Math.random() * 2.1) * K,
        })
      }
      for (let i = 0; i < 16; i++) {
        glitter.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 1,
          decay: 0.004 + Math.random() * 0.005,
          size: (1.2 + Math.random() * 1.6) * K,
        })
      }
    }

    /* the seal cracks, and what comes out of it flies up and bursts
       overhead rather than settling where it stood */
    const ox = origin ? origin.x : w / 2
    const oy = origin ? origin.y : h * 0.6
    let flash = 1

    // a handful of chips off the wax, gone almost at once
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9
      const sp = 2 + Math.random() * 2.2
      sparks.push({
        x: ox, y: oy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,
        life: 1,
        decay: 0.034 + Math.random() * 0.02,
        tint: CREAM[(Math.random() * CREAM.length) | 0],
        size: (1.2 + Math.random() * 1.2) * K,
      })
    }

    // ONE shell out of the seal — it climbs the card and breaks in cream
    shells.push({
      x: ox,
      y: oy,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -(h * 0.0146 + Math.random() * h * 0.002),
      target: h * (0.13 + Math.random() * 0.1),
      tint: '#fff3d4',
      big: true,
    })

    let last = performance.now()
    const frame = () => {
      const now = performance.now()
      // scale every step to real time so it looks the same at 30 or 120fps
      const k = Math.min((now - last) / 16.667, 3)
      last = now
      const elapsed = now - started
      // fade the whole thing out over the last second
      const fade = elapsed > duration - 1000 ? Math.max(0, (duration - elapsed) / 1000) : 1

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const halo = (x, y, r, tint, alpha) => {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = alpha * 0.5
        ctx.fillStyle = tint
        ctx.beginPath()
        ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // a bloom of light over the whole card as the seal gives way
      if (flash > 0.001) {
        flash *= Math.pow(0.86, k)
        const fg = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(w, h) * 0.42)
        fg.addColorStop(0, `rgba(255,246,214,${0.75 * flash})`)
        fg.addColorStop(0.35, `rgba(255,222,150,${0.28 * flash})`)
        fg.addColorStop(1, 'rgba(255,214,140,0)')
        ctx.fillStyle = fg
        ctx.fillRect(0, 0, w, h)
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i]
        if (s.delay > 0) {
          s.delay -= now - (s.seen || now)
          s.seen = now
          continue
        }
        s.x += ((s.vx || 0) + Math.sin(s.y * 0.02) * 0.25) * k
        s.vx = (s.vx || 0) * Math.pow(0.985, k)
        s.y += s.vy * k
        s.vy += 0.022 * k
        const r = (s.big ? 3.6 : 2.6) * K
        halo(s.x, s.y, r, s.tint, 0.95 * fade)
        // a tapering trail behind the climb
        for (let k = 1; k <= 6; k++) {
          halo(s.x - (s.vx || 0) * k * 0.8, s.y - s.vy * k * 0.85, r * (1 - k * 0.12), s.tint, (0.42 / k) * fade)
        }
        if (s.y <= s.target || s.vy >= 0) {
          burst(s.x, s.y, s.tint)
          shells.splice(i, 1)
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]
        p.x += p.vx * k
        p.y += p.vy * k
        p.vy += 0.032 * k
        p.vx *= Math.pow(0.985, k)
        p.vy *= Math.pow(0.985, k)
        p.life -= p.decay * k
        if (p.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        halo(p.x, p.y, Math.max(0.6, p.size * (0.4 + p.life * 0.75)), p.tint, Math.min(1, p.life * 1.25) * fade)
      }

      for (let i = glitter.length - 1; i >= 0; i--) {
        const g = glitter[i]
        g.x += g.vx * k
        g.y += g.vy * k
        g.vy += 0.012 * k
        g.life -= g.decay * k
        if (g.life <= 0) {
          glitter.splice(i, 1)
          continue
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = g.life * Math.abs(Math.sin(g.life * 22)) * fade
        ctx.fillStyle = '#fff0b0'
        ctx.fillRect(g.x, g.y, g.size + 0.8, g.size + 0.8)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      if (elapsed < duration) {
        raf = requestAnimationFrame(frame)
      } else {
        onDone?.()
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [duration, onDone, origin])

  return <canvas className="fireworks" ref={canvasRef} aria-hidden="true" />
}
