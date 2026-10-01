// Mirrors a Strava Beacon live-tracking link into the tracker, the same way
// garmin.js mirrors a Garmin LiveTrack session.
//
// NOT YET IMPLEMENTED. Strava Beacon links are public, browser-viewable pages
// that update every ~15s with no login required — so the same approach as
// garmin.js (open the link in a real headless browser, read the JSON
// responses the page fetches for itself) should work. But garmin.js was only
// written after inspecting actual network traffic from a real, live Garmin
// LiveTrack session — the request/response shape used there came from that
// session, not a guess. Nobody has provided a live Strava Beacon link to
// inspect the same way, so this stays a stub rather than shipping
// scraping logic aimed at an unverified target.
//
// To finish this: start a Strava activity with Beacon on, share the link it
// texts you, and pass that link to whoever's doing the inspection (the same
// way the Garmin link was used) to capture what the page actually requests.
//
// Same interface as garmin.js, so server.js doesn't need to change again
// once this is filled in.
const isBeaconUrl = (url) => /^https:\/\/(www\.)?strava\.com\/beacon\/.+$/i.test(url || '');

function setUrl(url, _onPoint) {
  if (url && isBeaconUrl(url)) {
    console.error(
      'strava bridge: a Beacon link was saved, but this bridge is not implemented yet — ' +
        'see the comment at the top of strava.js. No data will be mirrored.',
    );
  } else if (url) {
    console.error('strava bridge: ignoring link that is not a Strava Beacon URL');
  }
  return false; // never "switched" — nothing runs, so never clear the trail
}

module.exports = { setUrl, isBeaconUrl };
