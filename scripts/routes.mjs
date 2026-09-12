/**
 * Three invitations out of one build.
 *
 * Vite emits a single index.html. This copies it into a folder per
 * invitation, fixes the asset paths for the extra depth, and stamps in
 * which invitation that page is. GitHub Pages then serves
 *
 *   /jdwedding/octobertwoone      the church only
 *   /jdweddingreception           both days
 *   /jdreception/octobertwothree  the reception only
 *
 * as ordinary static folders — no router, no redirect trick, and it
 * works whatever the repository is called.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// The domain this is actually deployed at — needed because link-preview
// scrapers (WhatsApp, iMessage, etc.) fetch og:url/og:image as absolute
// URLs, not relative to the page.
const SITE = 'https://jd-wedding.vercel.app'

const ROUTES = [
  {
    path: 'jdwedding/octobertwoone',
    invite: 'wedding',
    title: 'Joel & Diya | Wedding Invitation',
    desc: 'Joel Philip weds Diya Ann George — 21 October 2026.',
    image: `${SITE}/og/og-wedding.jpg`,
  },
  {
    path: 'jdweddingreception',
    invite: 'both',
    title: 'Joel & Diya | Wedding & Reception Invitation',
    desc: 'Joel Philip weds Diya Ann George — Wedding on 21 October, Reception on 23 October 2026.',
    image: `${SITE}/og/og-both.jpg`,
  },
  {
    path: 'jdreception/octobertwothree',
    invite: 'reception',
    title: 'Joel & Diya | Reception Invitation',
    desc: 'Joel Philip and Diya Ann George — 23 October 2026.',
    image: `${SITE}/og/og-reception.jpg`,
  },
]

const source = readFileSync(join(dist, 'index.html'), 'utf8')

for (const route of ROUTES) {
  const depth = route.path.split('/').length
  const up = '../'.repeat(depth)
  const url = `${SITE}/${route.path}/`

  let html = source
    // "./assets/x.js" is relative to the page, so it needs the extra hops
    .replaceAll('="./', `="${up}`)
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${route.desc}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${route.title}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${route.desc}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${route.image}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${route.title}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${route.desc}"`)
    .replace(/(<meta name="twitter:image" content=")[^"]*"/, `$1${route.image}"`)
    // tell the app which invitation this is, before the bundle runs
    .replace('</head>', `  <script>window.__INVITE__=${JSON.stringify(route.invite)}</script>\n  </head>`)

  const dir = join(dist, route.path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  console.log(`  ${route.path}/  →  ${route.invite}`)
}

// a mistyped URL still lands on something rather than a bare 404
writeFileSync(join(dist, '404.html'), source)
console.log('  404.html  →  the full invitation')
