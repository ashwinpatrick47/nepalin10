# live-run-tracker

A live GPS run tracker: a runner's phone broadcasts its location, and a
website shows it moving in real time on a Mapbox GL JS map.

- `public/tracker.html` — opened on the runner's phone. Streams GPS
  position to the server.
- `public/map.html` — opened by viewers. Shows the runner's live position
  and trail on a map.
- `server.js` — Express + Socket.IO server that receives, stores, and
  broadcasts positions.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `MAPBOX_TOKEN` — required for the map to render. Get a free token at
  https://account.mapbox.com/access-tokens/ (sign up, then copy your
  "Default public token" or create a new one — no payment info needed
  for the free tier).
- `TRACKER_SECRET` — optional. If set, the phone must send this exact
  value in every location POST or the server rejects it. Leave it blank
  for quick local testing; set it before exposing the server to the
  internet.

## Run locally

```bash
npm start
```

The server listens on port 3000 (or `$PORT` if set). Open:

- Viewer map: http://localhost:3000/map.html
- Runner tracker: http://localhost:3000/tracker.html

## Testing locally with two tabs

1. Open `http://localhost:3000/map.html` in one tab — this is the viewer.
2. Open `http://localhost:3000/tracker.html` in another tab (same
   machine is fine for a smoke test) — this is the "runner."
3. On the tracker tab, allow location access when prompted, then press
   **Start**. Your browser's location will be sent to the server every
   time it changes.
4. Watch the map tab — a marker should appear and a green trail line
   should grow as new points arrive via Socket.IO.

This works on `localhost` without HTTPS because browsers treat
`localhost` as a secure context. See the HTTPS note below for testing on
an actual phone.

## Important: HTTPS requirement for real GPS tracking

`navigator.geolocation` only works on pages served over **HTTPS** or on
**localhost**. If you open `tracker.html` on a phone by pointing it at
your computer's local IP over plain HTTP (e.g. `http://192.168.1.5:3000`),
most mobile browsers will refuse to provide location.

To actually track a runner in the field, deploy this app somewhere with
real HTTPS — e.g. [Render.com](https://render.com) or
[Railway.app](https://railway.app) both offer free/cheap Node.js hosting
with HTTPS out of the box. Set `MAPBOX_TOKEN` and `TRACKER_SECRET` as
environment variables in their dashboard (do not commit your `.env`
file). Once deployed, open the tracker URL on the runner's phone and the
map URL from anywhere.

## iOS background-tracking limitation

iOS Safari (and any browser tab on iOS, since they're all WebKit) pauses
`watchPosition` updates when:

- the screen locks, or
- the tab is backgrounded (you switch to another app or another tab).

There is no web API workaround for this — only a native app using
background location permissions can track continuously with the screen
off. For this tracker, the runner needs to keep the tracker tab open and
in the foreground, with the screen on, for continuous updates. A screen
lock disabler ("Guided Access" or a low-brightness always-on screen) can
help mitigate this in practice, but is not guaranteed.

## Security note

`TRACKER_SECRET` is a simple shared-secret check, not real
authentication — it's meant to keep casual randoms from POSTing fake
locations to your public server, not to withstand a determined
attacker. Don't put anything sensitive behind it.

## Live-source links via Decap CMS

`/admin` on the deployed tracker is a [Decap CMS](https://decapcms.org) page (loaded from
the unpkg CDN) for editing the links below without redeploying anything.

### Garmin LiveTrack link

Paste a Garmin LiveTrack share link here. It saves to `content/livetrack.json` in the
repo, and the server polls that file every minute, so a new link takes effect within
about a minute (and starts a fresh trail — see "Event distance so far" below for why
the distance total doesn't also reset). Clear the link to stop mirroring. Only real
`https://livetrack.garmin.com/session/…/token/…` links are accepted.

**One-time setup**
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   Homepage URL: your tracker URL; **Authorization callback URL: `<tracker URL>/callback`**.
2. Create a client secret, then set `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`
   on the tracker's host (Render → Environment).
3. If your tracker URL isn't `https://live-run-tracker.onrender.com`, edit `base_url`
   (and `repo`/`branch` if needed) in `public/admin/config.yml`.
4. Open `<tracker URL>/admin/`, log in with GitHub, edit **Live tracker → Garmin LiveTrack link**, Publish.

**Note:** the repo is public, so a saved link (including its token) is visible in the repo
and its git history. A LiveTrack session expires (typically within a day), but treat the link
as sensitive — don't publish one you wouldn't want seen.

### Event distance so far (km)

Garmin resets its own distance to 0 at the start of every new LiveTrack session (a new
one every day, since sessions expire). The server carries this forward **automatically**:
every time it notices a new LiveTrack link (a session change), it takes whatever the map
was showing right before that moment and adds it on top of the new session's distance
going forward — so the map's total always reflects the whole event, not just the
current day, with no manual step. The trail (the line drawn on the map) still starts
fresh each session; only the distance number is cumulative.

This field in `/admin` is only a manual override — to correct a mistake, or to reset the
whole event's counter (e.g. starting a new event): set it to the number you want and
publish. The server adopts whatever's in the field on its very next poll (within about a
minute), same as a normal edit.

**For this to survive a server restart** — Render's free tier can sleep/restart anytime,
which wipes everything in memory, including this — set `GITHUB_WRITE_TOKEN` (see
`.env.example`) so the server can persist the carried-forward number back to this same
file itself. Without it, the automatic carry-forward still works for as long as the
server process happens to stay up, it just needs the field set by hand again after any
restart — for a 10-day event, set the token up beforehand rather than finding out mid-event.

### Strava Beacon link — not functional yet

The admin page (same `/admin` as above, **Strava Beacon link**) and the server-side
polling for it already exist, matching the Garmin setup one-for-one. What's missing is
`strava.js` itself: unlike the Garmin bridge, which was written by inspecting real
network traffic from an actual live LiveTrack session, nobody has supplied a real
Strava Beacon link to inspect the same way. Saving a Beacon link right now just logs a
warning in the server log — it won't appear on the map.

To finish it: start a Strava activity with Beacon on, grab the link it texts you, and
use it to find out what the Beacon page actually requests (the same way
`livetrack.garmin.com`'s `/api/.../track-points` endpoint was found) — then fill in
`strava.js`, following `garmin.js` as a template. It already exports the same
`setUrl(url, onPoint)` shape `server.js` expects.
