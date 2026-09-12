import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Scene from './three/Scene.jsx'
import Gate from './ui/Gate.jsx'
import Overlay from './ui/Overlay.jsx'
import Sections from './ui/Sections.jsx'
import { CornerFiligree } from './ui/Ornaments.jsx'
import { currentInvite } from './invites.js'

// How long the automatic walk takes, start to finish, if the guest never
// touches the scroll wheel. Scrolling manually always overrides this — it
// just resumes at whatever pace this sets once they stop. The walk itself
// only covers the ground up to the families section (see STOP_SELECTOR
// below) — once it arrives there it stops for good.
const AUTO_SCROLL_SECONDS = 18

// Where the automatic walk ends. Once the page has scrolled this element
// to the top of the screen, the walk stops permanently — no resuming, even
// if the guest scrolls back up and sits idle again.
const STOP_SELECTOR = '.section-families'

export default function App() {
  /* which of the three invitations this URL is — decided once */
  const invite = useMemo(() => currentInvite(), [])
  useEffect(() => {
    document.title = invite.docTitle
  }, [invite])

  const progress = useRef(0) // 0 → 1 across the sticky scene
  const introRef = useRef()
  const overlayRef = useRef()
  const [lit, setLit] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  /* Pick a detail tier from what the device tells us, then let the frame
     rate demote it if the guess was optimistic. Cores and memory alone
     say nothing about the GPU — a laptop can have eight cores and 16GB
     of RAM and still run integrated graphics that struggle with a scene
     this heavy, so ask the GPU itself what it is before trusting the
     CPU-side numbers. */
  const guessed = useMemo(() => {
    if (typeof navigator === 'undefined') return 'high'
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    const cores = navigator.hardwareConcurrency || 4
    const mem = navigator.deviceMemory || 4

    let weakGpu = false
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
      const renderer = dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl?.getParameter(gl.RENDERER)
      if (
        renderer &&
        /Intel|UHD|HD Graphics|Iris|Mali|Adreno\s?[1-5]\d\d|PowerVR|SwiftShader|llvmpipe|Basic Render/i.test(
          renderer
        )
      ) {
        weakGpu = true
      }
    } catch {
      // no WebGL debug info available — fall back to the cores/memory guess
    }

    if (mobile || cores <= 4 || mem <= 3 || weakGpu) return 'low'
    if (cores <= 8 || mem <= 6) return 'mid'
    return 'high'
  }, [])
  const [quality, setQuality] = useState(guessed)

  useEffect(() => {
    if (quality === 'low') return
    let frames = 0
    let start = performance.now()
    let raf
    const tick = () => {
      frames++
      const dt = performance.now() - start
      if (dt >= 1800) {
        if ((frames * 1000) / dt < 40) setQuality((q) => (q === 'high' ? 'mid' : 'low'))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => {
      frames = 0
      start = performance.now()
      raf = requestAnimationFrame(tick)
    }, 1200)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [quality])

  /* keep the page still until the seal is broken */
  useEffect(() => {
    document.documentElement.classList.add('is-locked')
    document.body.classList.add('is-locked')
  }, [])

  const unlock = () => {
    document.documentElement.classList.remove('is-locked')
    document.body.classList.remove('is-locked')
    setUnlocked(true)
  }

  /* one scroll listener drives both the camera and the words */
  useEffect(() => {
    let queued = false
    const read = () => {
      const el = introRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const t = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      progress.current = t
      overlayRef.current?.apply(t)
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        read()
        queued = false
      })
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  /* Once the seal breaks, the bride and groom walk on their own — no one
     should have to discover that this scrolls. A guest who does scroll
     always wins: the walk simply pauses while they're actively doing it,
     then picks back up from wherever they left it. Once the walk has
     finished, the aisle becomes a one-way vestibule: a guest can always
     scroll back up to look at the start again, but as soon as they stop
     scrolling the page eases back down to where the walk ended — it
     never lets them settle partway through. */
  useEffect(() => {
    if (!unlocked) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let raf
    let last = performance.now()
    let lastInput = 0
    const markInput = () => {
      lastInput = performance.now()
    }
    const opts = { passive: true }
    window.addEventListener('wheel', markInput, opts)
    window.addEventListener('touchstart', markInput, opts)
    window.addEventListener('touchmove', markInput, opts)
    window.addEventListener('keydown', markInput)

    // if the tab was backgrounded, don't let the gap while it was hidden
    // count as elapsed walking time — pick up cleanly from "now" instead
    // of leaping forward to cover the time it was away
    const onVisible = () => {
      if (!document.hidden) last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisible)

    // a short grace period after the card opens before the walk begins,
    // so the scene has a moment to settle first
    const startedAt = performance.now() + 300

    // Whichever element actually scrolls the page — html or body,
    // depending on the browser's quirks mode. Reading and writing
    // .scrollTop on it directly (rather than window.scrollY / scrollBy)
    // is the one scroll primitive that has never been subject to
    // scroll-behavior:smooth in any browser, so it can't be fought by a
    // stray CSS rule the way scrollTo/scrollBy can.
    const scroller = document.scrollingElement || document.documentElement

    // The absolute document position (in px from the very top of the
    // page) where the stop element currently sits. Read fresh each tick
    // rather than cached once, since fonts/images loading can shift
    // layout slightly while the walk is under way.
    const stopY = () => {
      const el = document.querySelector(STOP_SELECTOR)
      if (!el) return null
      return el.getBoundingClientRect().top + scroller.scrollTop
    }

    // How many seconds of actual "walking" have elapsed — only ticks up
    // while the walk is actually eligible to move (past the grace period,
    // not paused for user input). This is what the ideal position below
    // is paced against, so pausing/resuming never throws the pace off.
    let walked = 0

    // Rather than nudging the page by a raw per-frame amount (which looks
    // like a stutter any time a frame is slow to arrive — exactly what
    // happens under this heavy a 3D scene), each tick eases the visible
    // scroll position toward where it *should* be for the time elapsed.
    // That keeps the motion looking smooth and continuous even when the
    // render thread is briefly busy, instead of snapping forward in one
    // big jump to make up for it. Frame-rate independent, so it reads the
    // same at 30fps as at 60fps. The same easing shape is reused for the
    // snap-back below, just with its own (faster) rate.
    const EASE = 10
    const IDLE_WALK = 250 // ms of no input before the timed walk resumes
    const IDLE_SNAP = 600 // ms of no input before a snap-back kicks in
    const SNAP_EASE = 6

    // Once the timed walk reaches the stop point, it's done for good —
    // it never re-times itself off "walked" again. From then on the only
    // job left is the snap-back, below.
    let walkDone = false

    const tick = (now) => {
      const dt = Math.max(0, now - last) / 1000
      last = now

      const target = stopY()
      if (target == null || target <= 0) {
        raf = requestAnimationFrame(tick)
        return
      }

      const current = scroller.scrollTop

      if (!walkDone) {
        if (current >= target - 0.5) {
          walkDone = true
        } else if (now > startedAt && now - lastInput > IDLE_WALK) {
          walked += dt
          const idealY = Math.min(target, (target / AUTO_SCROLL_SECONDS) * walked)
          const step = (idealY - current) * (1 - Math.exp(-EASE * dt))
          if (step > 0.05) {
            scroller.scrollTop = current + step
          }
        }
      } else if (current < target - 0.5 && now - lastInput > IDLE_SNAP) {
        const step = (target - current) * (1 - Math.exp(-SNAP_EASE * dt))
        if (step > 0.05) {
          scroller.scrollTop = current + step
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('wheel', markInput)
      window.removeEventListener('touchstart', markInput)
      window.removeEventListener('touchmove', markInput)
      window.removeEventListener('keydown', markInput)
    }
  }, [unlocked])

  return (
    <>
      <Gate onOpen={unlock} invite={invite} />

      <div className="intro" ref={introRef}>
        <div className="stage">
          <div className="stage__canvas">
            <Canvas
              shadows
              dpr={quality === 'low' ? [1, 1.4] : quality === 'mid' ? [1, 1.5] : [1, 1.75]}
              gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
              camera={{ fov: 46, near: 0.1, far: 420, position: [2.4, 2.75, 19] }}
              onCreated={() => setLit(true)}
            >
              <Suspense fallback={null}>
                <Scene progress={progress} quality={quality} />
                {quality !== 'low' && (
                  <EffectComposer disableNormalPass multisampling={0}>
                    <Bloom
                      intensity={0.5}
                      luminanceThreshold={0.74}
                      luminanceSmoothing={0.3}
                      mipmapBlur
                      radius={0.7}
                    />
                    <Vignette offset={0.26} darkness={0.46} />
                  </EffectComposer>
                )}
              </Suspense>
            </Canvas>
          </div>

          <div className="vignette" />
          <div className="gilt">
            <CornerFiligree className="gilt__corner gilt__corner--tl" />
            <CornerFiligree className="gilt__corner gilt__corner--tr" />
            <CornerFiligree className="gilt__corner gilt__corner--bl" />
            <CornerFiligree className="gilt__corner gilt__corner--br" />
          </div>

          <Overlay ref={overlayRef} invite={invite} />

          <div className={`loading${lit ? ' is-done' : ''}`}>Preparing the aisle…</div>
        </div>
      </div>

      <Sections invite={invite} />
    </>
  )
}
