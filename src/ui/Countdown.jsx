import { useEffect, useState } from 'react'
import { CornerFiligree } from './Ornaments.jsx'

const p2 = (n) => String(n).padStart(2, '0')

function remaining(target) {
  const diff = target - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return {
    d: Math.floor(s / 86400),
    h: p2(Math.floor((s % 86400) / 3600)),
    m: p2(Math.floor((s % 3600) / 60)),
    s: p2(s % 60),
  }
}

export default function Countdown({ iso, label = 'Until we say I do' }) {
  const target = new Date(iso).getTime()
  const [left, setLeft] = useState(() => remaining(target))

  useEffect(() => {
    setLeft(remaining(target))
    const id = setInterval(() => setLeft(remaining(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <div className="plate">
      <CornerFiligree className="plate__corner plate__corner--a" />
      <CornerFiligree className="plate__corner plate__corner--b" />
      <div className="plate__label u-caps">{label}</div>
      {left ? (
        <div className="clock">
          <div className="clock__cell">
            <b className="clock__n">{left.d}</b>
            <i className="clock__u">Days</i>
          </div>
          <div className="clock__cell">
            <b className="clock__n">{left.h}</b>
            <i className="clock__u">Hours</i>
          </div>
          <div className="clock__cell">
            <b className="clock__n">{left.m}</b>
            <i className="clock__u">Minutes</i>
          </div>
          <div className="clock__cell">
            <b className="clock__n">{left.s}</b>
            <i className="clock__u">Seconds</i>
          </div>
        </div>
      ) : (
        <div className="plate__done">Today is the day</div>
      )}
    </div>
  )
}
