# Nepal in 10

Marketing/tracking site for **Nepal in 10** — Rahul Sharma's attempt to run
1,027km across Nepal via the Mahendra Highway in 10 days, raising support for
Nepal Heart Foundation. Live at
[nepalin10.com](https://www.nepalin10.com).

This repo is a monorepo containing two separately deployed apps:

- **the main site** (repo root) — the Next.js marketing site
- **`live-run-tracker/`** — a standalone Express/Socket.IO service that shows
  the runner's live GPS position on a map during the event

They deploy independently (Vercel and Render respectively) and don't share a
build step, but live in one repo/git history for convenience.

## Main site

### Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** — most scroll-driven animation/parallax across the site
- **Lenis** — smooth scroll, instantiated once in `src/components/smoothScroll.tsx`
  and exposed on `window.__lenis` so other components (e.g. the footer's
  anchor links) can drive scroll through the same instance
- **GSAP ScrollTrigger** — used in exactly one place
  (`src/components/terrain/ManifestoReveal.tsx`); everywhere else on the site
  uses Lenis + Framer Motion instead
- **Mapbox GL JS** — powers the 3D terrain sequence
  (`src/components/terrain/TopographicMap.tsx`). Falls back to a built-in SVG
  contour illustration with no external dependency if
  `NEXT_PUBLIC_MAPBOX_TOKEN` isn't set
- **Cloudinary** (optional) — `src/components/SiteImage.tsx` is a drop-in
  replacement for `next/image` that resolves images to Cloudinary URLs when
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is configured, and falls back to serving
  straight from `/public` otherwise

### Structure

```
src/
  app/            App Router pages, root layout/metadata, robots.ts, sitemap.ts
  components/     Page sections and shared UI
  components/terrain/   The 3D terrain/manifesto sequence specifically
  content/        JSON content edited through the CMS (see below)
  data/           Static route/scene data (e.g. terrain waypoints)
  Fonts/          Self-hosted font files
```

### Content editing

Non-technical edits (the "Track me" on/off switch) go through
[Decap CMS](https://decapcms.org/), reachable at the tracker's `/admin`
(see below) rather than the main site — the tracker is what handles the
GitHub sign-in, since it already needed server-side OAuth for its own CMS use.
`src/content/site-settings.json` is the file it writes to.

### SEO / structured data

`src/app/layout.tsx` sets page metadata (title, Open Graph, Twitter Card) and
a JSON-LD `@graph` describing the site as a `WebSite` + `Person` (Rahul
Sharma) + `SportsEvent` + `Organization` (Ebb&Flo, the production entity
behind the run). `src/app/robots.ts` and `src/app/sitemap.ts` round out the
crawlability setup.

### Environment variables

See `.env.local.example` at the repo root — all optional, with graceful
fallbacks if unset:

- `NEXT_PUBLIC_MAPBOX_TOKEN` — real Mapbox terrain instead of the SVG fallback
- `NEXT_PUBLIC_TRACKER_URL` — where "Track me" links point (the deployed
  `live-run-tracker` map page)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — serve images from Cloudinary instead
  of `/public` directly

## `live-run-tracker/`

A separate Express app, deployed as a Docker service on Render
(`live-run-tracker/render.yaml` + `Dockerfile`). Holds GPS trail state
**in memory only** — no database — so it resets on every restart or
Render free-tier idle-sleep, by design.

### Stack

- **Express** + **Socket.IO** — HTTP API and real-time push to connected map
  viewers
- **Mapbox GL JS** (`public/map.html`) — satellite/terrain basemap with a
  custom neon trail/marker rendering, entirely client-side, no build step
- **Playwright** (headless Chromium) — the optional Garmin LiveTrack bridge
  (`garmin.js`): Garmin's API rejects plain server requests, so this opens
  the real LiveTrack page in a real (headless) browser and passively reads
  the track-point responses it fetches on its own. Image/font/stylesheet
  requests are blocked at the network level so it doesn't render the actual
  visual map — only runs the page's JS enough to trigger those API calls,
  which keeps memory well under Render's free-tier 512MB cap
- **Decap CMS** (`public/admin/`) — two ways to publish a new LiveTrack link:
  - **GitHub login** (`cms.html`) — for whoever has repo access; the tracker
    itself handles the OAuth flow (`/auth`, `/callback` in `server.js`)
  - **Password only** (`index.html`) — for anyone else, no GitHub account
    needed. Checks the password first (`POST /api/check-password`) before
    revealing the publish form, then commits via the GitHub Contents API
    using a token only the site owner holds (`github-write.js`)

### How it gets its data

`server.js` polls `content/livetrack.json` from this repo's `raw.githubusercontent.com`
URL every minute (`LIVETRACK_POLL_MS`) and, if a Garmin LiveTrack URL is set
there, starts/restarts the Playwright bridge to mirror it. A phone running
GPS-tracking software can also push points directly via
`POST /api/location` (shared-secret authenticated), independent of Garmin.

### Environment variables

See `live-run-tracker/.env.example` — most are optional. `MAPBOX_TOKEN` is
the only one required for the map itself to render.

## Deployment

- **Main site**: Vercel, auto-deploys on push to `main`
- **Tracker**: Render (Docker), also auto-deploys on push to `main` — its
  `render.yaml` only excludes `live-run-tracker/content/**` from triggering a
  rebuild, so most pushes to the repo rebuild both services regardless of
  which app they actually touched

## Local development

```bash
# Main site
npm install
npm run dev          # http://localhost:3000

# Tracker (separate terminal)
cd live-run-tracker
npm install
npm start             # http://localhost:3000 by default — set PORT to avoid
                       # colliding with the main site above
```
