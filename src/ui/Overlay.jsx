import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Crest, Fleuron, Pin } from './Ornaments.jsx'
import Countdown from './Countdown.jsx'
import { COUPLE } from '../config.js'

const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ramp = (t, a, b) => cl((t - a) / (b - a))
/* fades in over [inA,inB] and back out over [outA,outB] */
const band = (t, inA, inB, outA, outB) => Math.min(ramp(t, inA, inB), 1 - ramp(t, outA, outB))

/**
 * The words over the scene, one short thought at a time so nothing has
 * to compete for the same patch of sky. The beats come from whichever
 * invitation this is, so a reception guest never reads about the church.
 * Written straight to the DOM from the scroll handler — scrolling never
 * re-renders React.
 */
const Overlay = forwardRef(function Overlay({ invite }, ref) {
  const title = useRef()
  const count = useRef()
  const mids = useRef([])

  /* The middle beats: the invitation line, then one card per event.
     They share the run of scroll between the title and the countdown. */
  const beats = useMemo(() => {
    const out = [{ kind: 'lines', lines: invite.invitation }]
    invite.events.forEach((e) => out.push({ kind: 'event', event: e }))
    return out
  }, [invite])

  const slots = useMemo(() => {
    const A = 0.2
    const B = 0.9
    const w = (B - A) / beats.length
    return beats.map((_, i) => {
      const a = A + i * w
      return [a, a + w * 0.26, a + w * 0.6, a + w * 0.9]
    })
  }, [beats])

  useImperativeHandle(ref, () => ({
    apply(t) {
      const set = (el, o, y) => {
        if (!el) return
        el.style.opacity = o
        el.style.transform = `translateY(${y}px)`
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      }

      // the names, which lead
      const a = band(t, -1, 0, 0.12, 0.2)
      set(title.current, a, (1 - a) * -30)

      // then each beat in turn
      slots.forEach((s, i) => {
        const v = band(t, s[0], s[1], s[2], s[3])
        set(mids.current[i], v, (1 - v) * 26)
      })

      // and the countdown, which stays
      const e = ramp(t, 0.9, 0.97)
      set(count.current, e, (1 - e) * 26)
    },
  }))

  const hidden = { opacity: 0, visibility: 'hidden' }

  return (
    <>
      <div className="beat beat--title" ref={title}>
        <Crest className="beat__crest" label={COUPLE.monogram} />
        <h1 className="beat__word">{invite.word}</h1>
        <div className="beat__names">
          {COUPLE.groom}
          <span className="beat__amp">&amp;</span>
          {COUPLE.bride}
        </div>
      </div>

      {beats.map((b, i) => (
        <div
          className="beat beat--mid"
          key={i}
          ref={(el) => {
            mids.current[i] = el
          }}
          style={hidden}
        >
          {b.kind === 'lines' ? (
            <>
              <div className="beat__rule">
                <i />
                <Fleuron />
                <i />
              </div>
              <p className="beat__line">
                {b.lines.map((l, k) => (
                  <span key={k}>
                    {l}
                    {k < b.lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </>
          ) : (
            <>
              {invite.events.length > 1 && <p className="beat__tag u-caps">{b.event.label}</p>}
              <p className="beat__lead">{b.event.date}</p>
              <p className="beat__sub">
                {b.event.day} · {b.event.time}
              </p>
              <p className="beat__sub beat__sub--venue">{b.event.venue.name}</p>
              <a
                className="beat__map"
                href={b.event.venue.map}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Pin className="beat__pin" />
                <span>{b.event.venue.place}</span>
              </a>
            </>
          )}
        </div>
      ))}

      <div className="beat beat--count" ref={count} style={hidden}>
        <Countdown iso={invite.countdownTo.iso} label={invite.countdownLead} />
      </div>
    </>
  )
})

export default Overlay
