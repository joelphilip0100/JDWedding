import { useState, useCallback, useRef } from 'react'
import { Crest, CornerFiligree, Fleuron } from './Ornaments.jsx'
import Fireworks from './Fireworks.jsx'
import { COUPLE } from '../config.js'

/**
 * The sealed card. A heart of wax holds it shut; break it and the two
 * gilded halves swing open onto the scene while the sky lights up.
 */
export default function Gate({ onOpen, invite }) {
  const [state, setState] = useState('sealed') // sealed | open | gone
  const [spark, setSpark] = useState(false)
  const [origin, setOrigin] = useState(null)
  const sealRef = useRef()

  const unseal = useCallback(() => {
    if (state !== 'sealed') return
    // burst from wherever the seal actually is on screen
    const r = sealRef.current?.getBoundingClientRect()
    if (r) setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    setSpark(true)
    setState('open')
    onOpen?.()
    window.setTimeout(() => setState('gone'), 1900)
  }, [state, onOpen])

  return (
    <>
      {state !== 'gone' && (
        <div className={`gate${state === 'open' ? ' is-open' : ''}`}>
          <div className="gate__panel gate__panel--l" />
          <div className="gate__panel gate__panel--r" />

          <div className="gate__frame">
            <CornerFiligree className="gate__corner gate__corner--tl" />
            <CornerFiligree className="gate__corner gate__corner--tr" />
            <CornerFiligree className="gate__corner gate__corner--bl" />
            <CornerFiligree className="gate__corner gate__corner--br" />
          </div>

          <div className="gate__plate">
            <Crest className="gate__crest" label={COUPLE.monogram} />
            <div className="gate__eyebrow">{invite.gate.eyebrow}</div>

            <h1 className="gate__names">
              {COUPLE.groom.split(' ')[0]}
              <span className="gate__amp">&amp;</span>
              {COUPLE.bride.split(' ')[0]}
            </h1>

            <div className="gate__rule">
              <i />
              <Fleuron />
              <i />
            </div>

            <div className="gate__date">{invite.gate.date}</div>

            <button className="seal" ref={sealRef} onClick={unseal} aria-label="Break the seal to open the invitation">
              <svg viewBox="0 0 120 116">
                <defs>
                  <radialGradient id="waxHeart" cx="36%" cy="26%" r="82%">
                    <stop offset="0%" stopColor="#e8b866" />
                    <stop offset="42%" stopColor="#cd9438" />
                    <stop offset="78%" stopColor="#a8731f" />
                    <stop offset="100%" stopColor="#7d5312" />
                  </radialGradient>
                  <radialGradient id="waxSheen" cx="34%" cy="22%" r="42%">
                    <stop offset="0%" stopColor="#fff4d2" stopOpacity=".85" />
                    <stop offset="100%" stopColor="#fff4d2" stopOpacity="0" />
                  </radialGradient>
                  {/* the pressed, uneven edge of poured wax */}
                  <filter id="waxEdge" x="-25%" y="-25%" width="150%" height="150%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="7" result="n" />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                  {/* the grain of the wax surface */}
                  <filter id="waxGrain" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="3" result="g" />
                    <feColorMatrix in="g" type="saturate" values="0" result="gs" />
                    <feComponentTransfer in="gs" result="gc">
                      <feFuncA type="table" tableValues="0 0.42" />
                    </feComponentTransfer>
                    <feComposite in="gc" in2="SourceAlpha" operator="in" />
                  </filter>
                </defs>

                {/* the blob of wax, edge roughened so it reads as poured */}
                <g filter="url(#waxEdge)">
                  <path
                    d="M60 108C60 108 12 78 12 45C12 25 27 13 43 13C52 13 58 18 60 24C62 18 68 13 77 13C93 13 108 25 108 45C108 78 60 108 60 108Z"
                    fill="url(#waxHeart)"
                  />
                </g>
                {/* grain, highlight and the stamped monogram */}
                <path
                  d="M60 108C60 108 12 78 12 45C12 25 27 13 43 13C52 13 58 18 60 24C62 18 68 13 77 13C93 13 108 25 108 45C108 78 60 108 60 108Z"
                  fill="#5c3a0c"
                  filter="url(#waxGrain)"
                  opacity=".5"
                />
                <ellipse cx="46" cy="38" rx="26" ry="20" fill="url(#waxSheen)" />
                <path
                  d="M60 96C60 96 22 72 22 46C22 31 33 22 45 22C53 22 58 27 60 32C62 27 67 22 75 22C87 22 98 31 98 46C98 72 60 96 60 96Z"
                  fill="none"
                  stroke="#6d4810"
                  strokeWidth="1.4"
                  opacity=".55"
                />
                <text x="60" y="63" textAnchor="middle">
                  {COUPLE.monogram}
                </text>
              </svg>
            </button>

            <p className="gate__hint">{invite.gate.hint}</p>
          </div>
        </div>
      )}

      {spark && <Fireworks origin={origin} onDone={() => setSpark(false)} />}
    </>
  )
}
