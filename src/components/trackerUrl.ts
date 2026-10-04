import siteSettings from "@/content/site-settings.json";

// Where the "Track me" links go: the live-run-tracker map page. Set
// NEXT_PUBLIC_TRACKER_URL to its deployed HTTPS URL; the localhost fallback
// only works while both apps run on your own machine.
export const TRACKER_URL =
  process.env.NEXT_PUBLIC_TRACKER_URL || "http://localhost:3001/map.html";

// Toggled from Decap (Site settings → Tracking live) rather than hardcoded,
// so turning tracking on/off doesn't need a code change — just a publish and
// the ~1-2 min Vercel rebuild it triggers. Every "Track me" link greys out
// while this is false, instead of linking to an empty map.
export const TRACKING_LIVE = siteSettings.trackingLive;
