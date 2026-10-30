// Mirrors a Garmin LiveTrack session into the tracker. Garmin's LiveTrack API
// rejects plain server requests (403), so this opens the shared link in a
// normal headless browser — exactly what a viewer does — and passively reads
// the track-point responses the page fetches for itself. It sends no requests
// of its own. Requires the optional `playwright` package.
//
// setUrl() can be called any time (e.g. when the link is edited in the CMS):
// it switches the bridge to the new session, or stops it when the link is empty.
const seen = new Set();
// Caps how many dateTime strings `seen` holds — unbounded growth over a
// multi-day session is a slow memory leak that matters a lot more on a
// 512MB container than it would anywhere else. Evicting the oldest half
// once this is hit is safe: points only ever arrive newest-last (sorted
// below), so what's evicted is never checked against again.
const SEEN_MAX = 4000;
function trimSeen() {
  if (seen.size <= SEEN_MAX) return;
  const toDrop = seen.size - SEEN_MAX / 2;
  const it = seen.values();
  for (let i = 0; i < toDrop; i++) seen.delete(it.next().value);
}

// Only ever open real LiveTrack share links — the link comes from an editable
// file, so never let it point the server's browser at arbitrary sites.
const LIVETRACK_URL = /^https:\/\/livetrack\.garmin\.com\/session\/[0-9a-f-]{36}\/token\/[0-9A-F]{16,64}\/?$/i;
const isLivetrackUrl = (url) => typeof url === 'string' && LIVETRACK_URL.test(url);

// Force a fresh browser/page this often, independent of errors. Garmin's own
// live-map SPA is the thing actually growing memory the longer a session
// stays genuinely active (it's their JS holding state/redrawing, not ours) —
// an idle/empty session never showed this, which is why it only surfaces
// once someone is really moving. Reloading periodically resets THEIR memory
// growth, not just ours. Short enough to bound the leak, long enough that a
// 5-15s reload never meaningfully gaps the trail (points arrive far less
// often than this).
const PAGE_REFRESH_MS = 20 * 60 * 1000;

function toPoint(tp) {
  return {
    lat: tp.position.lat,
    lng: tp.position.lon,
    accuracy: null,
    speed: typeof tp.speedMetersPerSec === 'number' ? tp.speedMetersPerSec : null,
    heartRate: tp.heartRateBeatsPerMin ?? null,
    distanceMeters: typeof tp.totalDistanceMeters === 'number' ? tp.totalDistanceMeters : null,
    timestamp: Date.parse(tp.dateTime),
  };
}

async function run(url, onPoint, setBrowser) {
  const { chromium } = require('playwright');
  // --disable-dev-shm-usage: containers often cap /dev/shm well below what
  // Chromium wants by default, which otherwise shows up as random crashes
  // under load rather than a clean error — this makes it use /tmp instead.
  //
  // The rest trim Chromium's own baseline (background timers, extensions,
  // sync, telemetry, breakpad) that a real headful browser wants but a
  // single scraping tab never uses — standard "lean headless" flags, not
  // experimental ones. --js-flags caps the page's own JS heap: on a 512MB
  // container, a memory spike with this unset gets the OS to OOM-kill the
  // *entire container* (unrecoverable without Render noticing and
  // restarting it — this is what actually took the server down). Capped,
  // the same spike crashes just this Chromium tab instead, which IS
  // something the retry loop in launch() below already catches and
  // recovers from on its own.
  const browser = await chromium.launch({
    args: [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-extensions',
      '--disable-sync',
      '--disable-ipc-flooding-protection',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--js-flags=--max-old-space-size=128',
    ],
  });
  setBrowser(browser);
  const page = await browser.newPage();

  // All this bridge actually reads is the page's own background fetches for
  // track-points JSON (below) — it never needs to visually render Garmin's
  // live map. Blocking the expensive resource types means Chromium's JS
  // still runs and still fires those requests, but skips the actual map
  // tiles/images/fonts, which is what was pushing memory past the free
  // tier's 512MB cap and getting the whole container killed after a while.
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
      return route.abort();
    }
    route.continue();
  });

  page.on('response', async (res) => {
    if (!/\/api\/.*track-points/.test(res.url())) return;
    try {
      const { trackPoints } = await res.json();
      (trackPoints || [])
        .filter((tp) => tp.position && !seen.has(tp.dateTime))
        .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime))
        .forEach((tp) => {
          seen.add(tp.dateTime);
          onPoint(toPoint(tp));
        });
      trimSeen();
    } catch {
      // non-JSON or aborted response — ignore
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('garmin bridge: watching LiveTrack session');
  await new Promise((resolve) => {
    page.on('close', resolve);
    browser.on('disconnected', resolve);
    // Not an error path — see PAGE_REFRESH_MS above. launch()'s loop
    // treats this exactly like any other end of run(): close, pause,
    // reopen a fresh browser+page pointed at the same URL.
    setTimeout(resolve, PAGE_REFRESH_MS);
  });
  await browser.close().catch(() => {});
}

function launch(url, onPoint) {
  let stopped = false;
  let browser = null;
  (async () => {
    while (!stopped) {
      try {
        await run(url, onPoint, (b) => { browser = b; });
      } catch (err) {
        if (!stopped) console.error('garmin bridge error:', err.message);
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 10000));
    }
  })();
  return {
    url,
    stop() {
      stopped = true;
      if (browser) browser.close().catch(() => {});
    },
  };
}

let current = null;

// Returns true if the bridge switched to a different link (so the caller can
// clear the previous run's trail).
function setUrl(url, onPoint) {
  const next = isLivetrackUrl(url) ? url : null;
  if (url && !next) console.error('garmin bridge: ignoring link that is not a LiveTrack session URL');
  if ((current ? current.url : null) === next) return false;
  if (current) current.stop();
  current = null;
  seen.clear();
  if (next) current = launch(next, onPoint);
  return true;
}

module.exports = { setUrl, isLivetrackUrl };
