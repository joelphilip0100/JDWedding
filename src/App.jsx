import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Scene from './three/Scene.jsx'
import Gate from './ui/Gate.jsx'
import Overlay from './ui/Overlay.jsx'
import Sections from './ui/Sections.jsx'
import MusicPlayer from './ui/MusicPlayer.jsx'
import { CornerFiligree } from './ui/Ornaments.jsx'
import { currentInvite } from './invites.js'

// How long the automatic walk takes, start to finish, if the guest never
// touches the page. It walks all the way to the very bottom. The instant
// the guest scrolls, taps, or presses a key, the walk stops for good —
// it never resumes and never eases the page back down afterward. From
// that point on the guest has full, permanent control of the scroll.
const AUTO_SCROLL_SECONDS = 18

export default function App() {
  /* which of the three invitations this URL is — decided once */
  const invite = useMemo(() => currentInvite(), [])
  useEffect(() => {
    document.title = invite.docTitle
  }, [invite])

  const progress = useRef(0) // 0 → 1 across the sticky scene
  const introRef = useRef()
  const overlayRef = useRef()
  const musicRef = useRef()
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
    // still inside the click that broke the seal, so the browser still
    // counts this as a real user gesture and allows audio to start
    musicRef.current?.start()
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
     should have to discover that this scrolls. The very first touch,
     scroll, or key press from the guest — at any point, even mid-walk —
     hands control over for good: the automatic walk stops right where it
     is and never starts again, and the page is never eased or snapped
     back to any position afterward. The guest can then scroll freely, in
     either direction, exactly like an ordinary page. */
  useEffect(() => {
    if (!unlocked) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let raf
    let last = performance.now()
    let stopped = false

    // Whichever element actually scrolls the page — html or body,
    // depending on the browser's quirks mode. Reading and writing
    // .scrollTop on it directly (rather than window.scrollY / scrollBy)
    // is the one scroll primitive that has never been subject to
    // scroll-behavior:smooth in any browser, so it can't be fought by a
    // stray CSS rule the way scrollTo/scrollBy can.
    const scroller = document.scrollingElement || document.documentElement

    // The value we ourselves last wrote to scrollTop. Used to tell our
    // own programmatic movement apart from a scroll the guest caused —
    // a scrollbar drag or a trackpad gesture doesn't fire wheel/touch/key
    // events, so watching for scrollTop drifting away from what we set is
    // the only reliable way to catch every kind of manual scroll.
    let lastWritten = scroller.scrollTop

    const stopWalking = () => {
      stopped = true
    }
    const opts = { passive: true }
    window.addEventListener('wheel', stopWalking, opts)
    window.addEventListener('touchstart', stopWalking, opts)
    window.addEventListener('touchmove', stopWalking, opts)
    window.addEventListener('keydown', stopWalking)

    const onScroll = () => {
      if (stopped) return
      if (Math.abs(scroller.scrollTop - lastWritten) > 1) stopWalking()
    }
    window.addEventListener('scroll', onScroll, opts)

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

    // How many seconds of actual "walking" have elapsed — only ticks up
    // once past the grace period. This is what the ideal position below
    // is paced against.
    let walked = 0

    // Rather than nudging the page by a raw per-frame amount (which looks
    // like a stutter any time a frame is slow to arrive — exactly what
    // happens under this heavy a 3D scene), each tick eases the visible
    // scroll position toward where it *should* be for the time elapsed.
    // That keeps the motion looking smooth and continuous even when the
    // render thread is briefly busy, instead of snapping forward in one
    // big jump to make up for it. Frame-rate independent, so it reads the
    // same at 30fps as at 60fps.
    const EASE = 10

    const tick = (now) => {
      const dt = Math.max(0, now - last) / 1000
      last = now

      if (stopped) return // guest has taken over — never touch scroll again

      // The full scrollable height of the page, read fresh each tick
      // rather than cached once, since fonts/images loading (or the
      // couple's walk itself revealing later sections) can change it
      // while the walk is under way.
      const target = Math.max(0, scroller.scrollHeight - window.innerHeight)
      const current = scroller.scrollTop

      if (target > 0.5 && current < target - 0.5 && now > startedAt) {
        walked += dt
        const idealY = Math.min(target, (target / AUTO_SCROLL_SECONDS) * walked)
        const step = (idealY - current) * (1 - Math.exp(-EASE * dt))
        if (step > 0.05) {
          scroller.scrollTop = current + step
          // read back rather than trust the value we wrote — the browser
          // may clamp it, and lastWritten needs to match reality so the
          // scroll listener doesn't mistake our own clamped move for one
          // the guest made
          lastWritten = scroller.scrollTop
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('wheel', stopWalking)
      window.removeEventListener('touchstart', stopWalking)
      window.removeEventListener('touchmove', stopWalking)
      window.removeEventListener('keydown', stopWalking)
      window.removeEventListener('scroll', onScroll)
    }
  }, [unlocked])

  return (
    <>
      <Gate onOpen={unlock} invite={invite} />
      <MusicPlayer ref={musicRef} />

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
