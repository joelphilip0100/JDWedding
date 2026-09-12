import photo from './photo.jpg'

// ---------------------------------------------------------------
// Everything you would normally want to change lives in this file.
// ---------------------------------------------------------------

export const COUPLE = {
  groom: 'Joel Philip',
  bride: 'Diya Ann George',
  monogram: 'JD',
  groomParents: ['Dr. Joji M. Philip', 'Dr. Jyothi Susan Abraham'],
  brideParents: ['Mr. Roy George Thomas', 'Mrs. Bindu Annie George'],
}

export const CEREMONY = {
  // ISO 8601 with the offset baked in, so the countdown is identical
  // for a guest in Kochi and a guest in Chicago.
  iso: '2026-10-21T17:00:00+05:30',
  dayLine: '21 · 10 · 2026',
  yearLine: '2026',
  timeLine: 'Wednesday  ·  5:00 PM',
  venue: 'St. George Orthodox Church',
  venueLine2: 'Puthuppally, Kottayam, Kerala',
  shortDate: '21 · 10 · 2026',
}

export const VERSE = {
  text: 'Therefore what God has joined together, let no one separate.',
  cite: 'Mark 10:9',
}

// Imported rather than linked, so the URL is resolved against the
// bundle and keeps working on the nested invitation routes.
export const PHOTO_SRC = photo
