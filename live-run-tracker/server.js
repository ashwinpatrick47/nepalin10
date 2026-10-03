require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const TRACKER_SECRET = process.env.TRACKER_SECRET;
const MAX_TRAIL_POINTS = 2000;

// In-memory state: latest position + running trail.
// Resets whenever the server restarts (no database, by design for this tracker).
let latest = null;
const trail = [];

// Garmin resets its own distance to 0 at the start of every LiveTrack
// session (a new one each day) — this is added on top of whatever the live
// session reports, so the map shows the whole event's total instead of just
// today's. syncLivetrack() below carries this forward automatically on every
// session change (and persists it via github-content.js, if configured, so
// it survives a restart too) — the "Event distance so far (km)" field in
// content/livetrack.json is only for a manual correction if one's ever
// needed. Setting it to 0 there and publishing is the reset — there's no
// separate reset control.
let distanceOffsetMeters = 0;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// The tracker's root sends visitors to the main website; the website's
// "Track me" link is what leads to /map.html.
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
app.get('/', (req, res) => {
  res.redirect(SITE_URL);
});

app.get('/api/config', (req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_TOKEN || '' });
});

app.get('/api/location', (req, res) => {
  res.json({ latest, trail });
});

function addPoint(rawPoint) {
  // Phone-tracker points (POST /api/location, below) never carry
  // distanceMeters, so this only ever touches Garmin/Strava points — the
  // offset addition is skipped entirely when there's nothing to add it to.
  const point =
    typeof rawPoint.distanceMeters === 'number'
      ? { ...rawPoint, distanceMeters: rawPoint.distanceMeters + distanceOffsetMeters }
      : rawPoint;
  latest = point;
  trail.push(point);
  if (trail.length > MAX_TRAIL_POINTS) {
    trail.splice(0, trail.length - MAX_TRAIL_POINTS);
  }
  io.emit('location', { latest, point });
}

app.post('/api/location', (req, res) => {
  const { lat, lng, accuracy, speed, secret } = req.body || {};

  if (TRACKER_SECRET && secret !== TRACKER_SECRET) {
    return res.status(401).json({ error: 'invalid secret' });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  addPoint({
    lat,
    lng,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    speed: typeof speed === 'number' ? speed : null,
    timestamp: Date.now(),
  });

  res.json({ ok: true });
});

// --- Decap CMS: GitHub login ------------------------------------------------
// Decap (public/admin) signs in with GitHub through these two routes. Create a
// GitHub OAuth App (callback URL: <this site>/callback) and set
// GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET. Saving in the CMS
// commits to the repo as the signed-in GitHub user, so only people with write
// access to the repo can change anything.
const crypto = require('crypto');
const GH_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const GH_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;

app.get('/auth', (req, res) => {
  if (!GH_ID || !GH_SECRET) return res.status(503).send('GitHub OAuth is not configured on this server.');
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: req.secure || req.headers['x-forwarded-proto'] === 'https', maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({ client_id: GH_ID, scope: 'public_repo,user', state });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')));
  const { code, state } = req.query;
  const finish = (status, payload) => {
    const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
    res.send(`<!doctype html><script>
      (function () {
        function receive(e) { window.opener.postMessage(${JSON.stringify(message)}, e.origin); }
        window.addEventListener('message', receive, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>`);
  };
  if (!GH_ID || !GH_SECRET) return finish('error', { message: 'GitHub OAuth is not configured' });
  if (!code || !state || state !== cookies.oauth_state) return finish('error', { message: 'Invalid login state, try again' });
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GH_ID, client_secret: GH_SECRET, code }),
    });
    const data = await r.json();
    if (!data.access_token) return finish('error', { message: data.error_description || 'GitHub refused the login' });
    finish('success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    finish('error', { message: err.message });
  }
});

// --- Garmin LiveTrack link, editable from the CMS ----------------------------
// The CMS saves { "url": "..." } to content/livetrack.json in the repo. Poll the
// committed file (public repo => plain raw URL) so a change takes effect within a
// minute without redeploying.
const garmin = require('./garmin');
const { updateDistanceOffsetKm } = require('./github-content');
const LIVETRACK_SOURCE =
  process.env.LIVETRACK_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/livetrack.json`;

async function syncLivetrack() {
  // The CMS file is authoritative whenever it can be read (empty = off).
  // GARMIN_LIVETRACK_URL is only used if the file doesn't exist yet (404).
  let url = process.env.GARMIN_LIVETRACK_URL || '';
  try {
    const r = await fetch(`${LIVETRACK_SOURCE}${LIVETRACK_SOURCE.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (r.ok) {
      const data = await r.json();
      url = (data.url || '').trim();
      // Adopts whatever's currently in the file — normally that's just this
      // same automatic carry-forward reflecting back at us (a no-op, since
      // it already matches what's in memory), but it's also how a manual
      // correction in /admin, or the value last persisted before a restart,
      // gets picked back up.
      if (typeof data.distanceOffsetKm === 'number' && Number.isFinite(data.distanceOffsetKm)) {
        const newOffsetMeters = data.distanceOffsetKm * 1000;
        if (newOffsetMeters !== distanceOffsetMeters) {
          console.log(`distance offset updated: ${data.distanceOffsetKm}km`);
          distanceOffsetMeters = newOffsetMeters;
        }
      }
    } else if (r.status !== 404) {
      return; // temporary problem reading the file — keep whatever is running
    }
  } catch {
    return;
  }

  const sessionChanged = garmin.setUrl(url, addPoint);
  if (sessionChanged) {
    // Carry forward whatever the map was showing right before this new
    // session started — latest.distanceMeters is already the cumulative
    // total (the offset's already baked in by addPoint), so it's exactly
    // tomorrow's starting point, no separate addition needed. Only runs
    // when there WAS a previous session with at least one point; pasting
    // the very first link ever has nothing to carry forward from.
    if (latest && typeof latest.distanceMeters === 'number') {
      const carryForwardKm = latest.distanceMeters / 1000;
      distanceOffsetMeters = carryForwardKm * 1000;
      console.log(`session changed — carrying distance forward: ${carryForwardKm}km`);
      // Persisted in the background — doesn't block the map from already
      // using the new value above. If this fails (or GITHUB_WRITE_TOKEN
      // isn't set), the carry-forward still works for as long as this
      // process stays up; it just won't survive a restart until the field
      // is set by hand again.
      updateDistanceOffsetKm(carryForwardKm).catch((err) =>
        console.error('github-content: unexpected error:', err.message),
      );
    }
    latest = null;
    trail.length = 0; // a different session => start a fresh trail
  }
}


// --- Strava Beacon link, editable from the CMS ------------------------------
// Same pattern as syncLivetrack()/garmin.js above. strava.js is currently a
// stub (see its header comment) — the polling/CMS wiring is ready, but no
// data is actually mirrored yet until it's filled in against a real Beacon
// link.
const strava = require('./strava');
const STRAVA_SOURCE =
  process.env.STRAVA_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/strava.json`;

async function syncStrava() {
  let url = process.env.STRAVA_BEACON_URL || '';
  try {
    const r = await fetch(`${STRAVA_SOURCE}${STRAVA_SOURCE.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (r.ok) {
      const data = await r.json();
      url = (data.url || '').trim();
    } else if (r.status !== 404) {
      return;
    }
  } catch {
    return;
  }
  if (strava.setUrl(url, addPoint)) {
    latest = null;
    trail.length = 0;
  }
}

server.listen(PORT, () => {
  console.log(`live-run-tracker listening on port ${PORT}`);
  if (process.env.DISABLE_GARMIN_BRIDGE !== '1') {
    syncLivetrack();
    setInterval(syncLivetrack, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
  }
  if (process.env.DISABLE_STRAVA_BRIDGE !== '1') {
    syncStrava();
    setInterval(syncStrava, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
  }
});
