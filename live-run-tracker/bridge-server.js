require('dotenv').config();

// Runs ONLY the Garmin LiveTrack scraper (garmin.js), as a separate process/
// service from the main live-run-tracker web server. See server.js's own
// POST /api/location comment for why: that headless browser is the thing
// that's crashed repeatedly under real sustained load, and when it took
// the whole container down with it, it took the map down for everyone
// watching too — not just the tracking data. Isolated here, the same
// crash only pauses new points arriving; the public map, served entirely
// by the other process, is never affected by it.
//
// Binds a trivial HTTP server purely so Render treats this as a "web"
// service, not because it needs to receive real requests — Render's
// background "worker" services have no free tier at all, so a true
// worker here would mean paying just to run this one piece. A free web
// service does exist, but free web services on Render sleep after 15
// minutes with no inbound HTTP request, which would silently stop this
// from ever polling Garmin at all. Pair this with a free external
// uptime-pinger (e.g. UptimeRobot, free tier, ping this service's own
// URL every 5 minutes) to keep it awake — a standard, genuinely free
// pattern for exactly this situation, not a paid workaround.
const http = require('http');
const garmin = require('./garmin');

const TRACKER_SECRET = process.env.TRACKER_SECRET;
const MAIN_SERVICE_URL = process.env.MAIN_SERVICE_URL;

if (!MAIN_SERVICE_URL) {
  console.error('MAIN_SERVICE_URL is required — the public URL of the main live-run-tracker service to POST points to (e.g. https://live-run-tracker.onrender.com).');
  process.exit(1);
}
if (!TRACKER_SECRET) {
  console.error('TRACKER_SECRET is required — must match the main service\'s own TRACKER_SECRET exactly.');
  process.exit(1);
}

const LIVETRACK_SOURCE =
  process.env.LIVETRACK_SOURCE_URL ||
  `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'ashwinpatrick47/nepalin10'}/${process.env.GITHUB_BRANCH || 'main'}/live-run-tracker/content/livetrack.json`;

async function postPoint(point) {
  try {
    const res = await fetch(`${MAIN_SERVICE_URL}/api/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...point, secret: TRACKER_SECRET }),
    });
    if (!res.ok) {
      console.error('bridge: main service rejected point:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('bridge: failed to reach main service:', err.message);
    // Not retried — the next real GPS point a few seconds later is a more
    // useful signal than this one stale point would be anyway.
  }
}

async function syncLivetrack() {
  // Same read-the-committed-file pattern as the main service's own
  // syncLivetrack() — kept independent on purpose rather than having one
  // service tell the other over HTTP, so either one restarting doesn't
  // depend on the other being up.
  let url = process.env.GARMIN_LIVETRACK_URL || '';
  try {
    const r = await fetch(`${LIVETRACK_SOURCE}${LIVETRACK_SOURCE.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (r.ok) {
      const data = await r.json();
      url = (data.url || '').trim();
    } else if (r.status !== 404) {
      return;
    }
  } catch {
    return;
  }
  garmin.setUrl(url, postPoint);
}

// The trivial server Render needs to see a port bound — also what the
// free keep-alive pinger hits. Reports whether the bridge actually thinks
// it's watching a session, which doubles as a cheap manual status check.
const PORT = process.env.PORT || 3001;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, watching: garmin.isWatching() }));
  })
  .listen(PORT, () => {
    console.log(`garmin bridge worker listening on port ${PORT} (keep-alive target)`);
  });

console.log('garmin bridge worker starting — will POST points to', MAIN_SERVICE_URL);
syncLivetrack();
setInterval(syncLivetrack, Number(process.env.LIVETRACK_POLL_MS) || 60 * 1000);
