// Mirrors a Garmin LiveTrack session into the tracker. Garmin's LiveTrack API
// rejects plain server requests (403), so this opens the shared link in a
// normal headless browser — exactly what a viewer does — and passively reads
// the track-point responses the page fetches for itself. It sends no requests
// of its own. Requires the optional `playwright` package (npm i playwright).
const seen = new Set();

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

async function run(url, onPoint) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
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

function start(url, onPoint) {
  (async () => {
    for (;;) {
      try {
        await run(url, onPoint);
      } catch (err) {
        console.error('garmin bridge error:', err.message);
      }
      await new Promise((r) => setTimeout(r, 10000));
    }
  })();
}

module.exports = { start };
