import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Scene from './three/Scene.jsx'
import Gate from './ui/Gate.jsx'
import Overlay from './ui/Overlay.jsx'
import Sections from './ui/Sections.jsx'
import { CornerFiligree } from './ui/Ornaments.jsx'
import { currentInvite } from './invites.js'

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

  /* Pick a detail tier from what the device tells us, then let the frame
     rate demote it if the guess was optimistic. */
  const guessed = useMemo(() => {
    if (typeof navigator === 'undefined') return 'high'
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    const cores = navigator.hardwareConcurrency || 4
    const mem = navigator.deviceMemory || 4
    if (mobile || cores <= 4 || mem <= 3) return 'low'
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
      if (dt >= 2500) {
        if ((frames * 1000) / dt < 34) setQuality((q) => (q === 'high' ? 'mid' : 'low'))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => {
      frames = 0
      start = performance.now()
      raf = requestAnimationFrame(tick)
    }, 1800)
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
    overlayRef.current?.reveal()
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

  return (
    <>
      <Gate onOpen={unlock} invite={invite} />

      <div className="intro" ref={introRef}>
        <div className="stage">
          <div className="stage__canvas">
            <Canvas
              shadows
              dpr={quality === 'low' ? [1, 1.4] : [1, 2]}
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
