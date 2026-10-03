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

## Live-source links via /admin

`<tracker URL>/admin` is a landing page with two options:

- **Login with GitHub** — goes to the real [Decap CMS](https://decapcms.org) page
  (`admin/cms.html`, loaded from the unpkg CDN), for whoever manages the repo directly.
- **Login with password** — a plain form (link, note, distance, Publish) for
  non-technical people, with no GitHub account needed at all.

Both end up editing the same `content/livetrack.json` the server polls every minute.

### Login with password: how it works

Submitting the form hits `POST /api/update-livetrack` on the server, which checks
`UPDATE_PASSWORD` and then writes `content/livetrack.json` straight to GitHub using
**your** token — so the commit is attributed to you, not to whoever filled out the form.
It only writes when the form is actually submitted; nothing runs in the background.

**Setup**
1. Set `UPDATE_PASSWORD` on the tracker's host (Render → Environment) to whatever
   password you'll hand out.
2. Create a GitHub fine-grained token: GitHub → Settings → Developer settings →
   Fine-grained tokens → Generate new token → Repository access "Only select
   repositories" → this repo → Permissions → Contents: Read and write.
3. Set that token as `GITHUB_WRITE_TOKEN` on the tracker's host.
4. Give whoever needs it the URL (`<tracker URL>/admin`) and the password. That's all
   they need — no invite, no account; they just pick "Login with password" on the
   landing page.

Leave `UPDATE_PASSWORD` or `GITHUB_WRITE_TOKEN` unset and the form will show an error on
submit instead of silently doing nothing.

### Login with GitHub: Garmin LiveTrack link

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
4. Open `<tracker URL>/admin/`, choose **Login with GitHub**, sign in, edit
   **Live tracker → Garmin LiveTrack link**, Publish.

**Note:** the repo is public, so a saved link (including its token) is visible in the repo
and its git history. A LiveTrack session expires (typically within a day), but treat the link
as sensitive — don't publish one you wouldn't want seen.

### Event distance so far (km)

Garmin resets its own distance to 0 at the start of every new LiveTrack session (a new
one every day, since sessions expire) — this field is added on top of whatever the
live session currently reports, so the map's distance stat shows the whole event's
total instead of resetting each day. The trail (the line drawn on the map) still
starts fresh each session — this only affects the number, not the drawn route.

Each time you paste a new day's link: first check today's final distance on the map,
then add it to this field before publishing. To reset the whole event's counter (e.g.
starting a new event), set it back to **0** and publish — that's the reset, there's no
separate button for it.

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
