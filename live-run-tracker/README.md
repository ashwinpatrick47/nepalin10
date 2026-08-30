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
