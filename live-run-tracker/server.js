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

function addPoint(point) {
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
    } else if (r.status !== 404) {
      return; // temporary problem reading the file — keep whatever is running
    }
  } catch {
    return;
  }
  if (garmin.setUrl(url, addPoint)) {
    latest = null;
    trail.length = 0; // a different session => start a fresh trail
  }
}

server.listen(PORT, () => {
  console.log(`live-run-tracker listening on port ${PORT}`);
  if (process.env.DISABLE_GARMIN_BRIDGE !== '1') {
    syncLivetrack();
    setInterval(syncLivetrack, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
  }
});
