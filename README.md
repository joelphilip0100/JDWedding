# Joel & Diya — Wedding Invitation

A scroll-driven 3D wedding invitation. React + React Three Fiber, deployed free
on GitHub Pages.

The visitor breaks a heart of wax on a gold-and-cream card, one cream shell
climbs and breaks overhead, the card parts, and scrolling walks the camera down
a stone aisle through flowering autumn fields toward the church at golden hour
while the couple walk on ahead. Every beat is tied to scroll position, so
scrolling back up rewinds the whole thing.

---

## Three invitations, one app

Different guest lists get different URLs. Nothing from one invitation appears in
another — wording, dates, venues, countdown and map links all switch together.

| Who | URL | What they see |
| --- | --- | --- |
| Church guests | `/jdwedding/octobertwoone` | The wedding only — 21 Oct, Puthuppally |
| Both days | `/jdweddingreception` | Wedding and reception |
| Reception guests | `/jdreception/octobertwothree` | The reception only — 23 Oct, Girideepam |
| Anyone else | `/` | Falls back to the fullest version |

Every word a guest reads lives in **`src/invites.js`** — dates, times, venues,
map links, the invitation lines, the sign-off. Change it there and it changes
everywhere on that route.

`scripts/routes.mjs` runs after `vite build` and writes one folder per
invitation into `dist/`, each with its own `<title>`, description and a
`window.__INVITE__` stamp. GitHub Pages serves them as plain static folders —
no router, no redirect trick, and it works whatever the repository is called.

In development you can reach the variants with a query instead:

```
http://localhost:5173/?invite=wedding
http://localhost:5173/?invite=both
http://localhost:5173/?invite=reception
```

---

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build into dist/, including the three routes
npm run preview    # serve that build locally
```

To check a route in the built output, `npm run preview` then visit
`/jdweddingreception/`.

---

## Deploying

### Vercel

Import the repository at [vercel.com/new](https://vercel.com/new) and deploy —
`vercel.json` already sets the build command, the output directory and
`trailingSlash`, so there is nothing to configure in the dashboard. Every push
to `main` redeploys; pull requests get their own preview URL.

The invitation URLs then become:

```
https://<your-domain>/jdwedding/octobertwoone
https://<your-domain>/jdweddingreception
https://<your-domain>/jdreception/octobertwothree
```

A custom domain goes in *Project → Settings → Domains*.

### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
Pages is free on public repositories; a private repository needs a paid plan.
Keeping both is fine — they deploy independently.

The build uses a relative `base`, so the same output works at a project-site
path (`user.github.io/repo/`) and at a domain root.

---

## What is where

```
src/
  invites.js          the three invitations — all guest-facing wording
  config.js           names, parents, the verse, the photo
  App.jsx             route resolution, scroll listener, quality tier
  photo.jpg           the keepsake photograph
  three/
    Scene.jsx         the whole 3D scene
    world.js          path curve, sky shader, palette, wind
    textures.js       every surface map, generated into a canvas at start-up
  ui/
    Gate.jsx          the sealed card
    Fireworks.jsx     the shell that breaks when the seal does
    Overlay.jsx       the words over the scene, one beat at a time
    Sections.jsx      families, venues with map links, verse, photo, sign-off
    Countdown.jsx     days / hours / minutes / seconds
    Ornaments.jsx     crest, filigree, fleuron, chevron, map pin
scripts/
  routes.mjs          writes the three route folders after the build
```

### Performance

The scene picks a detail tier from `hardwareConcurrency`, `deviceMemory` and the
user agent, then demotes itself if the first two seconds run below 34fps. Phones
start at the low tier. Scrolling never re-renders React — one listener writes a
0→1 value to a ref, and both the camera and the words read it from there.
