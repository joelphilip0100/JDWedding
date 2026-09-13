import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

// Lives in /public so it's the same absolute URL on all three routes,
// however deeply nested (/jdwedding/octobertwoone/, etc.).
const TRACK_SRC = '/audio/wedding-music.mp3'

/**
 * Soft background music that only ever starts once the guest has
 * broken the seal — browsers refuse audio before a real interaction
 * anyway, and it would be jarring to greet someone with sound before
 * they've asked to open anything. start() is called from that same
 * click, so the "this was a real gesture" flag browsers look for is
 * still active. A small button in the top-right corner lets a guest
 * mute it at any time; nothing is remembered between visits, so a
 * reload always begins quiet until the seal is broken again.
 */
const MusicPlayer = forwardRef(function MusicPlayer(_, ref) {
  const audioRef = useRef()
  const [muted, setMuted] = useState(false)
  const [started, setStarted] = useState(false)

  useImperativeHandle(ref, () => ({
    start() {
      const el = audioRef.current
      if (!el || started) return
      el.volume = 0.55
      // a guest's browser can still refuse this even from a real click
      // (e.g. a site-wide sound block) — fail quietly rather than throw
      el.play().catch(() => {})
      setStarted(true)
    },
  }))

  const toggle = () => {
    setMuted((m) => {
      const next = !m
      if (audioRef.current) audioRef.current.muted = next
      return next
    })
  }

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} loop preload="none" />

      {started && (
        <button
          type="button"
          className="music-toggle"
          onClick={toggle}
          aria-label={muted ? 'Unmute background music' : 'Mute background music'}
          aria-pressed={muted}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      )}
    </>
  )
})

export default MusicPlayer
