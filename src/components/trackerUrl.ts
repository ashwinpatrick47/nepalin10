// Where the "Track me" links go: the live-run-tracker map page. Set
// NEXT_PUBLIC_TRACKER_URL to its deployed HTTPS URL; the localhost fallback
// only works while both apps run on your own machine.
export const TRACKER_URL =
  process.env.NEXT_PUBLIC_TRACKER_URL || "http://localhost:3001/map.html";
