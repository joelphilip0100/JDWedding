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

const ROUTES = [
  {
    path: 'jdwedding/octobertwoone',
    invite: 'wedding',
    title: 'Joel & Diya | Wedding Invitation',
    desc: 'Joel Philip weds Diya Ann George — 21 October 2026, St. George Orthodox Church, Puthuppally.',
  },
  {
    path: 'jdweddingreception',
    invite: 'both',
    title: 'Joel & Diya | Wedding & Reception Invitation',
    desc: 'Joel Philip weds Diya Ann George — the wedding on 21 October at Puthuppally, and the reception on 23 October at Girideepam.',
  },
  {
    path: 'jdreception/octobertwothree',
    invite: 'reception',
    title: 'Joel & Diya | Reception Invitation',
    desc: 'Joel Philip and Diya Ann George — wedding reception, 23 October 2026, Girideepam Convention Centre, Kottayam.',
  },
]

const source = readFileSync(join(dist, 'index.html'), 'utf8')

for (const route of ROUTES) {
  const depth = route.path.split('/').length
  const up = '../'.repeat(depth)

  let html = source
    // "./assets/x.js" is relative to the page, so it needs the extra hops
    .replaceAll('="./', `="${up}`)
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${route.desc}"`)
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
