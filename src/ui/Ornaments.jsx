// Hand-drawn gilding: a crest, a filigree corner and a small cross rule.
// All of them paint with `currentColor`, so colour comes from CSS.

export function CornerFiligree(props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <path d="M0 38C24 38 38 24 38 0" strokeWidth="1.5" />
        <path d="M0 52C33 52 52 33 52 0" strokeWidth=".9" opacity=".72" />
        <path d="M10 70C10 44 24 24 50 16" strokeWidth=".7" opacity=".5" />
        {/* scrolled tips */}
        <path d="M38 0C38 12 44 20 55 21c8 .6 12-5 9-10-2.6-4.4-9-3.4-9 1.6 0 3.4 3 5 5.6 3.6" strokeWidth="1.2" />
        <path d="M0 38c12 0 20 6 21 17 .6 8-5 12-10 9-4.4-2.6-3.4-9 1.6-9 3.4 0 5 3 3.6 5.6" strokeWidth="1.2" />
        <path d="M52 0c0 16 10 27 26 29" strokeWidth=".7" opacity=".45" />
        <path d="M0 52c16 0 27 10 29 26" strokeWidth=".7" opacity=".45" />
      </g>
      <g fill="currentColor">
        <circle cx="38" cy="38" r="2.6" />
        <circle cx="26" cy="26" r="1.5" opacity=".8" />
        <circle cx="60" cy="12" r="1.4" opacity=".7" />
        <circle cx="12" cy="60" r="1.4" opacity=".7" />
        {/* small acanthus leaves */}
        <ellipse cx="30" cy="52" rx="8" ry="2.6" transform="rotate(-34 30 52)" opacity=".72" />
        <ellipse cx="52" cy="30" rx="8" ry="2.6" transform="rotate(-56 52 30)" opacity=".72" />
      </g>
    </svg>
  )
}

export function Fleuron(props) {
  return (
    <svg viewBox="0 0 30 52" aria-hidden="true" {...props}>
      <g fill="currentColor">
        {/* six petals, a full turn apart */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ellipse
            key={i}
            cx="15"
            cy="17.5"
            rx="3.3"
            ry="7"
            transform={`rotate(${i * 60} 15 26)`}
            opacity=".9"
          />
        ))}
        <circle cx="15" cy="26" r="3.1" />
        <ellipse cx="6.5" cy="40" rx="5.6" ry="2" transform="rotate(-26 6.5 40)" opacity=".7" />
        <ellipse cx="23.5" cy="40" rx="5.6" ry="2" transform="rotate(26 23.5 40)" opacity=".7" />
      </g>
    </svg>
  )
}

export function Crest({ label = 'JD', ...props }) {
  const [first, second] = [label.charAt(0) || 'J', label.charAt(1) || 'D']
  return (
    <svg viewBox="0 0 120 132" fill="none" aria-hidden="true" {...props}>
      {/* the ring is broken either side, and the monogram sits in the break
          so letters and emblem read as one mark */}
      <g stroke="currentColor" fill="none">
        <path d="M60 16a44 44 0 0 1 39 64" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M60 16a44 44 0 0 0-39 64" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M30 100a44 44 0 0 0 60 0" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M60 22a38 38 0 0 1 33.5 55" strokeWidth=".7" opacity=".55" strokeLinecap="round" />
        <path d="M60 22a38 38 0 0 0-33.5 55" strokeWidth=".7" opacity=".55" strokeLinecap="round" />
        <path d="M34.5 98a38 38 0 0 0 51 0" strokeWidth=".7" opacity=".55" strokeLinecap="round" />
      </g>

      {/* laurel sprigs filling the two breaks */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${60 + side * 44} 88) scale(${side} 1)`} fill="currentColor">
          <path d="M0 0c-5-4-8-10-7-16" stroke="currentColor" strokeWidth="1.2" fill="none" />
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={-2 - i * 1.6} cy={-4 - i * 4.4} rx="4.6" ry="1.9"
              transform={`rotate(${-38 - i * 8} ${-2 - i * 1.6} ${-4 - i * 4.4})`} opacity=".85" />
          ))}
        </g>
      ))}

      {/* a lozenge finial at the crown */}
      <g fill="currentColor">
        <path d="M60 0l4.2 7.2L60 14.4l-4.2-7.2Z" />
        <ellipse cx="52" cy="13" rx="4.6" ry="1.7" transform="rotate(-24 52 13)" opacity=".8" />
        <ellipse cx="68" cy="13" rx="4.6" ry="1.7" transform="rotate(24 68 13)" opacity=".8" />
      </g>

      {/* the two letters, overlapping so they interlock */}
      <text
        x="47" y="76" textAnchor="middle" fill="currentColor"
        style={{ fontFamily: '"Parisienne",cursive', fontSize: '56px' }}
      >
        {first}
      </text>
      <text
        x="73" y="82" textAnchor="middle" fill="currentColor"
        style={{ fontFamily: '"Parisienne",cursive', fontSize: '56px' }}
      >
        {second}
      </text>

      {/* a small ribbon under the monogram */}
      <path d="M46 108c6 5 22 5 28 0-5 7-23 7-28 0Z" fill="currentColor" opacity=".85" />
    </svg>
  )
}

export function Chevron(props) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>
      <path d="M4 9l8 8 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* a map pin, for the link out to each venue */
export function Pin(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 21.2c4.3-4.6 6.4-8 6.4-10.6A6.4 6.4 0 0 0 5.6 10.6c0 2.6 2.1 6 6.4 10.6Z" />
      <circle cx="12" cy="10.4" r="2.5" />
    </svg>
  )
}
