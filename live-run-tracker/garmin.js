// Mirrors a Garmin LiveTrack session into the tracker. Garmin's LiveTrack API
// rejects plain server requests (403), so this opens the shared link in a
// normal headless browser — exactly what a viewer does — and passively reads
// the track-point responses the page fetches for itself. It sends no requests
// of its own. Requires the optional `playwright` package.
//
// setUrl() can be called any time (e.g. when the link is edited in the CMS):
// it switches the bridge to the new session, or stops it when the link is empty.
const seen = new Set();

// Only ever open real LiveTrack share links — the link comes from an editable
// file, so never let it point the server's browser at arbitrary sites.
const LIVETRACK_URL = /^https:\/\/livetrack\.garmin\.com\/session\/[0-9a-f-]{36}\/token\/[0-9A-F]{16,64}\/?$/i;
const isLivetrackUrl = (url) => typeof url === 'string' && LIVETRACK_URL.test(url);

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
  const browser = await chromium.launch();
  setBrowser(browser);
  const page = await browser.newPage();

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
    } catch {
      // non-JSON or aborted response — ignore
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('garmin bridge: watching LiveTrack session');
  await new Promise((resolve) => {
    page.on('close', resolve);
    browser.on('disconnected', resolve);
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
