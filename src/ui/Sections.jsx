import { useEffect, useRef } from 'react'
import { Crest, CornerFiligree, Fleuron, Pin } from './Ornaments.jsx'
import { COUPLE, VERSE, PHOTO_SRC } from '../config.js'

function useReveal() {
  const ref = useRef()
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.rise') ?? []
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function Sections({ invite }) {
  const ref = useReveal()

  return (
    <div ref={ref}>
      {/* ---------------- the families ---------------- */}
      <section className="leaf leaf--paper">
        <CornerFiligree className="leaf__corner leaf__corner--tl" />
        <CornerFiligree className="leaf__corner leaf__corner--br" />
        <div className="leaf__in rise">
          <div className="eyebrow">{invite.families.eyebrow}</div>
          <div className="rule">
            <i />
            <Fleuron />
            <i />
          </div>
          <p className="lede">{invite.families.lede}</p>
          <div className="pair">
            <div>
              <div className="role">The Groom</div>
              <div className="who">{COUPLE.groom}</div>
              <div className="folks">
                son of
                <br />
                {COUPLE.groomParents[0]} &amp;
                <br />
                {COUPLE.groomParents[1]}
              </div>
            </div>
            <div className="pair__sep" />
            <div>
              <div className="role">The Bride</div>
              <div className="who">{COUPLE.bride}</div>
              <div className="folks">
                daughter of
                <br />
                {COUPLE.brideParents[0]} &amp;
                <br />
                {COUPLE.brideParents[1]}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ---------------- where to come ---------------- */}
      <section className="leaf leaf--paper">
        <CornerFiligree className="leaf__corner leaf__corner--tl" />
        <CornerFiligree className="leaf__corner leaf__corner--br" />
        <div className="leaf__in rise">
          <div className="eyebrow">Where to find us</div>
          <div className="rule">
            <i />
            <Fleuron />
            <i />
          </div>
          <div className="venues" data-n={invite.events.length}>
            {invite.events.map((e) => (
              <article className="venue" key={e.key}>
                <div className="venue__tag u-caps">{e.label}</div>
                <h3 className="venue__name">{e.venue.name}</h3>
                <div className="venue__when">
                  {e.day} · {e.date} · {e.time}
                </div>
                <div className="venue__place">{e.venue.place}</div>
                <a className="venue__map" href={e.venue.map} target="_blank" rel="noreferrer noopener">
                  <Pin className="venue__pin" />
                  <span>Open in Maps</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- the verse ---------------- */}
      <section className="leaf leaf--night">
        <CornerFiligree className="leaf__corner leaf__corner--tl" />
        <CornerFiligree className="leaf__corner leaf__corner--tr" />
        <CornerFiligree className="leaf__corner leaf__corner--bl" />
        <CornerFiligree className="leaf__corner leaf__corner--br" />
        <div className="leaf__in rise">
          <p className="verse">
            “{VERSE.text}”<cite>{VERSE.cite}</cite>
          </p>
        </div>
      </section>

      {/* ---------------- the keepsake ---------------- */}
      <section className="leaf leaf--paper">
        <CornerFiligree className="leaf__corner leaf__corner--tr" />
        <CornerFiligree className="leaf__corner leaf__corner--bl" />
        <div className="leaf__in rise">
          <div className="eyebrow">A moment we love</div>
          <h2 className="title">Us</h2>
          <div className="frame">
            <div className="frame__card">
              <CornerFiligree className="frame__corner frame__corner--a" />
              <CornerFiligree className="frame__corner frame__corner--b" />
              <div className="frame__inner">
                {PHOTO_SRC ? (
                  <img src={PHOTO_SRC} alt={`${COUPLE.groom} and ${COUPLE.bride}`} />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="3" y="6" width="18" height="14" rx="1.5" />
                      <circle cx="12" cy="13" r="3.2" />
                      <path d="M8 6l1.5-2h5L16 6" />
                    </svg>
                    <span>Photograph to follow</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- the sign-off ---------------- */}
      <section className="leaf leaf--night">
        <CornerFiligree className="leaf__corner leaf__corner--tl" />
        <CornerFiligree className="leaf__corner leaf__corner--tr" />
        <CornerFiligree className="leaf__corner leaf__corner--bl" />
        <CornerFiligree className="leaf__corner leaf__corner--br" />
        <div className="leaf__in rise sign">
          <Crest className="sign__crest" label={COUPLE.monogram} />
          <div className="sign__names">
            {COUPLE.groom.split(' ')[0]} &amp; {COUPLE.bride.split(' ')[0]}
          </div>
          <div className="sign__date">{invite.signOff}</div>
          <p className="sign__note">{invite.closing}</p>
        </div>
      </section>
    </div>
  )
}
