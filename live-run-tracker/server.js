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
// today's. Set via the "Event distance so far (km)" field in content/
// livetrack.json (edited through /admin); see syncLivetrack() below. Setting
// it back to 0 there IS the reset — there's no separate reset control.
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

// Lets a non-technical person publish a new LiveTrack link with just a
// password — no GitHub account needed. /update.html posts here; this writes
// content/livetrack.json straight to GitHub using a token only the site
// owner holds (GITHUB_WRITE_TOKEN), so the commit is attributed to the owner,
// not the person submitting the form.
const { updateLivetrackFile, updateSiteSettingsFile, updateRunStatusFile, updateTrailCheckpointFile } = require('./github-write');
const UPDATE_PASSWORD = process.env.UPDATE_PASSWORD;
const GITHUB_WRITE_TOKEN = process.env.GITHUB_WRITE_TOKEN;
const LIVETRACK_URL_PATTERN = /^$|^https:\/\/livetrack\.garmin\.com\/session\/[0-9a-fA-F-]{36}\/token\/[0-9A-Fa-f]{16,64}\/?$/;

// Lets /admin check the password on its own, before showing the rest of the
// form — so a wrong password is caught immediately instead of only after
// someone's filled in the LiveTrack link too.
app.post('/api/check-password', (req, res) => {
  if (!UPDATE_PASSWORD) {
    return res.status(503).json({ error: 'not configured' });
  }
  const { password } = req.body || {};
  if (password !== UPDATE_PASSWORD) {
    return res.status(401).json({ error: 'wrong password' });
  }
  res.json({ ok: true });
});

app.post('/api/update-livetrack', async (req, res) => {
  if (!UPDATE_PASSWORD) {
    return res.status(503).json({ error: 'not configured' });
  }
  const { password, url, note, distanceOffsetKm } = req.body || {};
  if (password !== UPDATE_PASSWORD) {
    return res.status(401).json({ error: 'wrong password' });
  }
  if (!GITHUB_WRITE_TOKEN) {
    return res.status(503).json({ error: 'not configured' });
  }
  if (typeof url !== 'string' || !LIVETRACK_URL_PATTERN.test(url)) {
    return res.status(400).json({ error: 'invalid link' });
  }
  const offset = Number(distanceOffsetKm);
  if (!Number.isFinite(offset) || offset < 0) {
    return res.status(400).json({ error: 'invalid distance' });
  }

  try {
    await updateLivetrackFile(GITHUB_WRITE_TOKEN, {
      url,
      note: typeof note === 'string' ? note : '',
      distanceOffsetKm: offset,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('update-livetrack failed:', err.message);
    res.status(502).json({ error: 'GitHub write failed' });
  }
});

// Read-only, unauthenticated — same raw-file pattern as syncLivetrack() below,
// just for a different file. Used by /admin to pre-check the "Track me live"
// box with whatever it's currently set to, so publishing a link doesn't
// silently flip tracking off just because the box defaulted unchecked.
const SITE_SETTINGS_RAW_URL =
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/src/content/site-settings.json`;

app.get('/api/site-settings', async (req, res) => {
  try {
    const settings = await fetch(SITE_SETTINGS_RAW_URL).then((r) => r.json());
    res.json({ trackingLive: Boolean(settings.trackingLive) });
  } catch (err) {
    res.status(502).json({ error: 'could not read site settings' });
  }
});

// Read-only, unauthenticated — same pattern as /api/site-settings above, for
// content/livetrack.json. Lets /admin show what's actually live right now
// (link, note, distance) instead of always opening the form blank, which
// made it impossible to tell whether a run was still on or to find the
// current distance to preserve when stopping it.
app.get('/api/livetrack-settings', async (req, res) => {
  try {
    const r = await fetch(`${LIVETRACK_SOURCE}?t=${Date.now()}`);
    if (!r.ok && r.status !== 404) throw new Error(`upstream ${r.status}`);
    const data = r.ok ? await r.json() : {};
    res.json({
      url: typeof data.url === 'string' ? data.url : '',
      note: typeof data.note === 'string' ? data.note : '',
      distanceOffsetKm: typeof data.distanceOffsetKm === 'number' ? data.distanceOffsetKm : 0,
    });
  } catch (err) {
    res.status(502).json({ error: 'could not read livetrack settings' });
  }
});

// Same password-gated, token-backed write as /api/update-livetrack, but for
// the "Track me" on/off switch (src/content/site-settings.json) — the one
// toggle that was only reachable through the GitHub-login side of /admin.
app.post('/api/update-site-settings', async (req, res) => {
  if (!UPDATE_PASSWORD) {
    return res.status(503).json({ error: 'not configured' });
  }
  const { password, trackingLive } = req.body || {};
  if (password !== UPDATE_PASSWORD) {
    return res.status(401).json({ error: 'wrong password' });
  }
  if (!GITHUB_WRITE_TOKEN) {
    return res.status(503).json({ error: 'not configured' });
  }
  if (typeof trackingLive !== 'boolean') {
    return res.status(400).json({ error: 'invalid trackingLive' });
  }

  try {
    await updateSiteSettingsFile(GITHUB_WRITE_TOKEN, { trackingLive });
    res.json({ ok: true });
  } catch (err) {
    console.error('update-site-settings failed:', err.message);
    res.status(502).json({ error: 'GitHub write failed' });
  }
});

// --- "Run started" email broadcast ------------------------------------------
// Fires once, the very first time ANY GPS point arrives (phone POST, Garmin
// bridge, or Strava — addPoint() is the shared entry point for all three)
// after content/run-status.json says the run hasn't started yet. The flag
// is committed to the repo (same poll-the-committed-file pattern as
// syncLivetrack()/syncStrava() below), not just held in memory — Render's
// free tier can restart this process mid-run, and an in-memory-only flag
// would re-broadcast to the whole subscriber list the next time a GPS
// point arrived after a restart.
const { sendRunStartedBroadcast } = require('./run-started-email');
const RUN_STATUS_SOURCE =
  process.env.RUN_STATUS_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/run-status.json`;

let runStarted = false;
let runStatusLoaded = false;

async function loadRunStatus() {
  try {
    const r = await fetch(`${RUN_STATUS_SOURCE}?t=${Date.now()}`);
    if (r.ok) {
      const data = await r.json();
      runStarted = Boolean(data.started);
    }
    // 404 (file not there yet) leaves runStarted = false, which is correct.
  } catch {
    // Temporary read problem — keep whatever's already in memory, same as
    // syncLivetrack()'s handling below.
  } finally {
    runStatusLoaded = true;
  }
}

async function markRunStarted() {
  if (runStarted) return;
  runStarted = true; // set synchronously first, so a point arriving a moment later can't race past this check
  console.log('First GPS point received — run has started, sending notification email.');
  try {
    await sendRunStartedBroadcast();
  } catch (err) {
    console.error('Failed to send run-started email:', err.message);
    // Don't revert runStarted — a transient email-API error shouldn't risk
    // a duplicate send once a retry succeeds later.
  }
  if (GITHUB_WRITE_TOKEN) {
    try {
      await updateRunStatusFile(GITHUB_WRITE_TOKEN, {
        started: true,
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to commit run-status.json:', err.message);
    }
  } else {
    console.warn('GITHUB_WRITE_TOKEN not set — run-status.json was not updated, so a restart before it is committed manually could trigger a duplicate email.');
  }
}

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

  if (runStatusLoaded && !runStarted) {
    markRunStarted();
  }
}

// Also the entry point for the separate garmin-bridge worker (see
// bridge-server.js) — it runs the heavy headless-browser scraping in its
// own isolated process/service and POSTs each point here over plain HTTP,
// authenticated the same way a phone would be. That isolation is the
// point: if the bridge's browser crashes under real sustained load (it
// has — see garmin.js's own history), only new data stops arriving here.
// This server — the one actually serving the map to everyone watching —
// never runs a browser itself, so it can't be taken down by that crash.
app.post('/api/location', (req, res) => {
  const { lat, lng, accuracy, speed, heartRate, distanceMeters, timestamp, secret } = req.body || {};

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
    heartRate: typeof heartRate === 'number' ? heartRate : null,
    distanceMeters: typeof distanceMeters === 'number' ? distanceMeters : null,
    // The bridge sends Garmin's own point timestamp; a phone sending plain
    // lat/lng won't have one, so this falls back to receive-time for that
    // case same as before.
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
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
// This service only reads content/livetrack.json for two things now: the
// distance offset (below), and noticing when the session URL itself
// changes so it knows to reset the trail. Actually watching the link and
// scraping Garmin — the part that needs a real headless browser — lives
// entirely in the separate bridge-server.js worker (see its own header
// comment and server.js's POST /api/location above for why they're split).
const LIVETRACK_SOURCE =
  process.env.LIVETRACK_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/livetrack.json`;

let lastKnownLivetrackUrl = null;

// --- Trail checkpointing ------------------------------------------------
// In-memory `trail` is lost on any restart (OOM, redeploy, crash) — fine
// for a short test, not for a 10-day public event with 1000+ viewers: an
// unexpected restart mid-event would silently blank the whole day's trail
// in front of everyone watching. Periodically backing up {url, latest,
// trail} to a committed file (same GitHub-write pattern as livetrack.json)
// means a restart loses at most a few minutes, not the whole run.
const CHECKPOINT_SOURCE =
  process.env.TRAIL_CHECKPOINT_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/trail-checkpoint.json`;
const CHECKPOINT_INTERVAL_MS = Number(process.env.CHECKPOINT_INTERVAL_MS) || 5 * 60 * 1000;
let lastCheckpointedTrailLength = 0;
let lastCheckpointedUrl = null;

// Runs once at startup, before the first syncLivetrack() call, so that
// call sees lastKnownLivetrackUrl already matching the checkpointed URL
// and doesn't immediately wipe the trail it just recovered by mistaking
// it for a brand-new session.
async function loadCheckpoint() {
  try {
    const r = await fetch(`${CHECKPOINT_SOURCE}?t=${Date.now()}`);
    if (!r.ok) return; // 404 (no checkpoint yet) or temporary problem — start empty, as before
    const data = await r.json();
    if (data.url) {
      lastKnownLivetrackUrl = data.url;
      lastCheckpointedUrl = data.url;
      latest = data.latest || null;
      if (Array.isArray(data.trail)) {
        trail.push(...data.trail);
        lastCheckpointedTrailLength = trail.length;
      }
      console.log(`restored checkpoint: ${trail.length} trail points for ${data.url}`);
    }
  } catch (err) {
    console.error('loadCheckpoint failed (starting empty):', err.message);
  }
}

async function saveCheckpoint() {
  if (!GITHUB_WRITE_TOKEN) return;
  // Nothing changed since the last save (same trail length, same session)
  // — skip the commit entirely rather than writing a no-op every interval.
  if (trail.length === lastCheckpointedTrailLength && lastKnownLivetrackUrl === lastCheckpointedUrl) return;
  try {
    await updateTrailCheckpointFile(GITHUB_WRITE_TOKEN, {
      url: lastKnownLivetrackUrl || '',
      latest,
      trail,
    });
    lastCheckpointedTrailLength = trail.length;
    lastCheckpointedUrl = lastKnownLivetrackUrl;
  } catch (err) {
    console.error('saveCheckpoint failed:', err.message);
  }
}

async function syncLivetrack() {
  // The CMS file is authoritative whenever it can be read (empty = off).
  // GARMIN_LIVETRACK_URL is only used if the file doesn't exist yet (404).
  let url = process.env.GARMIN_LIVETRACK_URL || '';
  try {
    const r = await fetch(`${LIVETRACK_SOURCE}${LIVETRACK_SOURCE.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (r.ok) {
      const data = await r.json();
      url = (data.url || '').trim();
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
  if (url !== lastKnownLivetrackUrl) {
    lastKnownLivetrackUrl = url;
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

server.listen(PORT, async () => {
  console.log(`live-run-tracker listening on port ${PORT}`);
  loadRunStatus();
  // Must finish before the first syncLivetrack() call below, so it sees
  // lastKnownLivetrackUrl already matching the recovered session instead
  // of treating it as new and wiping the trail it just restored.
  await loadCheckpoint();
  // No browser involved here anymore — just reading one small JSON file for
  // the distance offset and to notice session changes — so this always
  // runs, unconditionally, regardless of whether the bridge worker is up.
  syncLivetrack();
  setInterval(syncLivetrack, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
  setInterval(saveCheckpoint, CHECKPOINT_INTERVAL_MS);
  if (process.env.DISABLE_STRAVA_BRIDGE !== '1') {
    syncStrava();
    setInterval(syncStrava, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
  }
});
