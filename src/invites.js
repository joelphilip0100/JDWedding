// ---------------------------------------------------------------
// Three invitations, one app. Each guest list gets its own URL and
// its own wording — nothing from one leaks into another.
//
//   /jdwedding/octobertwoone      the church only
//   /jdweddingreception           both days
//   /jdreception/octobertwothree  the reception only
//
// Every word a guest reads comes from this file.
// ---------------------------------------------------------------

export const VENUES = {
  church: {
    name: 'St. George Orthodox Church',
    place: 'Puthuppally, Kottayam, Kerala',
    short: 'Puthuppally',
    map: 'https://share.google/fqBnQutMJQ55lVuI2',
  },
  hall: {
    name: 'Girideepam Convention Centre',
    place: 'Trivandrum, Kerala',
    short: 'Trivandrum',
    map: 'https://share.google/daMLVwdGgqBvFZjy6',
  },
}

export const EVENTS = {
  wedding: {
    key: 'wedding',
    label: 'The Wedding',
    // ISO with the offset baked in, so the countdown is the same in
    // Kochi and in Chicago
    iso: '2026-10-21T17:00:00+05:30',
    date: '21 · 10 · 2026',
    day: 'Wednesday',
    time: '5:00 PM',
    venue: VENUES.church,
  },
  reception: {
    key: 'reception',
    label: 'The Reception',
    iso: '2026-10-23T17:30:00+05:30',
    date: '23 · 10 · 2026',
    day: 'Friday',
    time: '5:30 PM',
    venue: VENUES.hall,
  },
}

const W = EVENTS.wedding
const R = EVENTS.reception

export const INVITES = {
  /* ---------------- the church, for those at the ceremony ---------------- */
  wedding: {
    id: 'wedding',
    word: 'Wedding',
    events: [W],
    countdownTo: W,
    docTitle: 'Joel & Diya | Wedding Invitation',
    gate: {
      eyebrow: 'Together with our families',
      date: W.date,
      hint: 'Break the seal to open',
    },
    invitation: ['Together with our families,', 'we ask you to stand with us', 'as we are getting married'],
    countdownLead: 'Until we are married',
    families: {
      eyebrow: 'With the blessing of our families',
      lede: 'Two hearts, one joyful promise — we would be honoured to have you beside us in church as we begin.',
    },
    signOff: `${W.date} · ${W.venue.short}`,
    closing: 'We look forward to seeing you at the church.',
  },

  /* ---------------- both days, for the closest circle ---------------- */
  both: {
    id: 'both',
    word: 'Wedding & Reception',
    events: [W, R],
    countdownTo: W,
    docTitle: 'Joel & Diya | Wedding & Reception Invitation',
    gate: {
      eyebrow: 'Together with our families',
      date: `${W.date}  &  ${R.date}`,
      hint: 'Break the seal to open',
    },
    invitation: ['Together with our families,', 'we ask you to join us for', 'both days of our celebration'],
    countdownLead: 'Until we are married',
    families: {
      eyebrow: 'With the blessing of our families',
      lede: 'Two hearts, one joyful promise — we would be honoured to have you beside us in church, and again at the table afterwards.',
    },
    signOff: `${W.date} & ${R.date} · ${W.venue.short} & ${R.venue.short}`,
    closing: 'We look forward to seeing you.',
  },

  /* ---------------- the reception, for the wider circle ---------------- */
  reception: {
    id: 'reception',
    word: 'Reception',
    events: [R],
    countdownTo: R,
    docTitle: 'Joel & Diya | Reception Invitation',
    gate: {
      eyebrow: 'Together with our families',
      date: R.date,
      hint: 'Break the seal to open',
    },
    invitation: ['Together with our families,', 'we ask you to join us', 'to celebrate the occasion'],
    countdownLead: 'Until we celebrate',
    families: {
      eyebrow: 'With the blessing of our families',
      lede: 'Two hearts, one joyful promise — we would be honoured to have you with us as we celebrate.',
    },
    signOff: `${R.date} · ${R.venue.short}`,
    closing: 'We look forward to celebrating with you.',
  },
}

/* Which invitation is this? The built pages each set window.__INVITE__;
   in dev you can also use ?invite=reception, and the path is the
   fallback so the routes work however they are served. */
export function currentInvite() {
  if (typeof window === 'undefined') return INVITES.both

  if (window.__INVITE__ && INVITES[window.__INVITE__]) return INVITES[window.__INVITE__]

  const q = new URLSearchParams(window.location.search).get('invite')
  if (q && INVITES[q]) return INVITES[q]

  // order matters — jdweddingreception contains jdwedding
  const path = window.location.pathname.toLowerCase()
  if (path.includes('jdweddingreception')) return INVITES.both
  if (path.includes('jdreception')) return INVITES.reception
  if (path.includes('jdwedding')) return INVITES.wedding

  return INVITES.both
}
