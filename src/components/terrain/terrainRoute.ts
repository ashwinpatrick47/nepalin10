// Single source of truth for the Mahendra Highway route: real waypoint
// coordinates (west to east) plus the SVG fallback geometry used when no
// Mapbox token is configured.

export type Waypoint = {
  label: string;
  lng: number;
  lat: number;
  /** Fraction of total distance travelled when this waypoint is reached, 0-1. */
  at: number;
};

export const TOTAL_ROUTE_KM = 1027;

// National centroid — used by the "NEPAL IN 10" ticker, not tied to any
// single waypoint along the highway.
export const NEPAL_COORDINATES = "28.3949°N, 84.1240°E";

// Approximate town-centre coordinates, west to east along the highway.
export const WAYPOINTS: Waypoint[] = [
  { label: "Mahendranagar", lng: 80.1706, lat: 28.9297, at: 0 },
  { label: "Nepalgunj", lng: 81.6167, lat: 28.05, at: 0.2 },
  { label: "Bharatpur", lng: 84.4342, lat: 27.6766, at: 0.55 },
  { label: "Hetauda", lng: 85.0325, lat: 27.4287, at: 0.66 },
  { label: "Kakarbhitta", lng: 88.1833, lat: 26.6167, at: 1 },
];

export const ROUTE_CHECKPOINTS = WAYPOINTS.map((point, index) => ({
  label: point.label,
  approxKm: Math.round(point.at * TOTAL_ROUTE_KM),
  tag:
    index === 0
      ? "START"
      : index === WAYPOINTS.length - 1
        ? "FINISH"
        : null,
}));

type RouteGeoJson = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

export const ROUTE_GEOJSON: RouteGeoJson = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: WAYPOINTS.map((point) => [point.lng, point.lat]),
  },
};

/** Linear interpolation of [lng, lat] + fields along the waypoint chain at fraction t (0-1). */
export function pointAlongRoute(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    if (clamped >= a.at && clamped <= b.at) {
      const span = b.at - a.at || 1;
      const local = (clamped - a.at) / span;
      return {
        lng: a.lng + (b.lng - a.lng) * local,
        lat: a.lat + (b.lat - a.lat) * local,
        km: Math.round((a.at + (b.at - a.at) * local) * TOTAL_ROUTE_KM),
        segmentIndex: i,
        localT: local,
      };
    }
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return { lng: last.lng, lat: last.lat, km: TOTAL_ROUTE_KM, segmentIndex: WAYPOINTS.length - 2, localT: 1 };
}

/** Bearing in degrees from point a to point b, for aligning the camera to direction of travel. */
export function bearingBetween(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// --- SVG fallback geometry (used when no Mapbox token is configured) ---
// Real Nepal national boundary against a 915x460 viewBox: simplified
// (Douglas-Peucker) from public domain boundary data and projected
// equirectangularly (lng/lat scaled directly to x/y), then smoothed with a
// centripetal Catmull-Rom spline through the simplified vertices. Not a
// stylized/invented shape — this is the country's actual outline.
export const FALLBACK_OUTLINE =
  "M175.1,0 C175.1,0.0 169.1,0.4 168,1.9 C167.0,3.3 169.3,7.2 168.1,8.1 " +
  "C166.0,9.7 154.5,0.9 151.3,3.2 C147.5,5.9 153.3,22.3 149.7,27.3 " +
  "C146.7,31.5 134.7,31.4 134.2,33.6 C133.9,34.8 137.4,35.6 137.7,37.3 " +
  "C138.2,39.8 136.4,45.8 133.8,47.7 C131.0,49.8 123.7,50.6 120.6,48.5 " +
  "C117.1,46.2 117.8,36.0 115.3,32.5 C113.6,30.1 111.9,28.4 109.4,27.8 " +
  "C106.4,27.0 100.0,31.0 98,29.8 C96.6,29.0 97.5,24.8 96.3,24.6 " +
  "C93.4,24.1 83.3,44.9 76.4,49.7 C71.6,53.0 66.2,51.4 61.8,54.5 " +
  "C56.3,58.3 52.6,68.8 47.4,72.9 C43.3,76.2 35.8,75.6 34.3,79 " +
  "C32.8,82.5 39.6,88.7 38.9,93.6 C38.1,99.5 31.2,108.9 27.2,111.5 " +
  "C25.0,113.0 21.1,111.2 20.4,112.7 C19.3,115.0 27.7,122.6 28.4,127.5 " +
  "C29.0,131.8 27.8,138.9 25.8,140.4 C24.5,141.3 21.0,139.0 20.5,139.7 " +
  "C19.9,140.6 24.8,145.2 24.1,146.6 C23.2,148.2 16.0,146.0 13.3,147.5 " +
  "C11.0,148.8 10.2,151.2 8.5,154 C5.9,158.4 0.9,166.6 0,171.8 " +
  "C-0.7,175.5 -1.2,179.2 0.9,181.9 C4.1,186.1 15.3,185.9 22.7,190.1 " +
  "C32.0,195.4 48.2,214.7 51.1,213.1 C52.9,212.1 48.2,202.9 49.4,200.2 " +
  "C50.2,198.4 51.6,197.1 54,197 C61.3,196.8 86.0,219.4 99.7,225.4 " +
  "C109.7,229.8 120.3,227.5 127.2,233.1 C134.3,238.8 136.8,258.8 141.3,259.9 " +
  "C143.7,260.5 146.0,255.3 148.5,254.9 C150.8,254.5 154.1,255.6 155.8,257.2 " +
  "C157.6,258.9 156.4,262.3 159,265.2 C165.3,272.3 196.1,291.5 205.3,290.4 " +
  "C209.6,289.9 210.7,283.7 214.1,282.5 C217.4,281.3 220.8,281.6 225.4,283.2 " +
  "C234.8,286.4 251.1,305.8 264.1,309.1 C275.1,311.9 291.2,302.4 297.3,306.2 " +
  "C301.5,308.8 302.8,316.6 303,321 C303.2,324.4 298.8,327.8 300.4,330.2 " +
  "C304.1,335.7 340.3,330.5 351.2,335.9 C357.8,339.2 360.1,349.0 364.3,349.6 " +
  "C367.5,350.0 372.1,346.8 373.7,344 C375.3,341.2 371.8,335.1 374.1,333 " +
  "C377.6,329.7 391.6,331.8 400.1,334.1 C409.1,336.5 423.5,349.8 426.5,347.8 " +
  "C428.2,346.7 424.0,339.6 425.8,337.7 C428.4,334.9 440.3,339.7 446.2,338 " +
  "C451.4,336.5 455.1,328.8 459.6,329.1 C464.8,329.5 468.3,340.0 475.3,343.3 " +
  "C484.6,347.7 505.0,344.1 512.4,349.1 C517.2,352.3 520.0,357.6 520.6,362.6 " +
  "C521.2,368.1 512.3,376.2 514.7,380.8 C518.1,387.3 544.9,386.9 550.8,391.6 " +
  "C553.6,393.9 553.0,397.9 555,399.2 C556.7,400.4 561.3,399.1 561.6,399.9 " +
  "C561.8,400.6 558.1,402.5 558.4,403.2 C559.0,404.5 574.0,399.2 577.1,401.8 " +
  "C579.7,403.9 576.2,411.8 578.6,414.2 C581.2,416.7 587.2,416.6 592.8,415.7 " +
  "C601.7,414.3 618.3,400.9 625.8,401.2 C629.8,401.4 632.8,403.2 634.8,406.1 " +
  "C637.5,409.9 634.4,420.0 637.4,424.2 C640.1,428.0 649.2,428.2 650.9,430.9 " +
  "C651.9,432.5 649.9,435.5 651,436.1 C653.2,437.4 664.3,425.4 671.4,424.8 " +
  "C678.6,424.2 687.4,432.6 693.8,432.9 C698.5,433.1 700.8,429.1 706.1,429.6 " +
  "C716.5,430.6 737.1,452.0 751.1,451.8 C763.5,451.6 779.9,431.0 785.8,433.5 " +
  "C789.5,435.1 786.4,444.5 790.1,448.5 C795.4,454.3 816.0,462.1 819.6,460 " +
  "C821.3,459.0 819.1,454.6 820.5,453 C822.2,451.1 826.6,450.3 830.2,450.5 " +
  "C835.0,450.7 840.4,456.2 846.9,456.4 C856.0,456.6 871.1,444.9 879.8,446.5 " +
  "C886.5,447.7 891.9,459.3 896,458.9 C898.9,458.6 900.6,455.1 902.8,451.3 " +
  "C906.9,444.1 913.2,427.1 913.8,416.1 C914.3,406.5 912.4,396.1 908.2,388.9 " +
  "C904.4,382.4 892.8,380.4 891.1,374.2 C889.3,367.5 899.1,357.0 899.7,349.5 " +
  "C900.2,343.5 895.8,339.5 896.6,332.8 C897.9,322.0 919.2,300.3 915,291.6 " +
  "C911.0,283.1 882.4,277.4 873.5,280.6 C867.5,282.8 866.9,294.4 862.2,296.6 " +
  "C858.3,298.4 851.9,296.9 848.5,295.3 C845.9,294.1 845.3,290.1 842.9,289.6 " +
  "C839.8,289.0 833.8,294.6 830.6,294.8 C828.7,294.9 826.1,294.1 825.8,293.3 " +
  "C825.6,292.6 828.4,290.9 828.1,290.4 C827.3,289.1 811.3,295.4 804.9,295.1 " +
  "C800.2,294.9 796.4,293.7 793,291.4 C789.3,288.9 788.4,283.2 783.8,280.1 " +
  "C776.9,275.5 757.6,275.2 752.4,270.8 C749.7,268.5 750.7,263.6 748.6,262.8 " +
  "C746.4,261.9 742.0,266.9 739,266.7 C736.1,266.5 732.9,261.2 730.7,262.1 " +
  "C727.7,263.3 728.4,275.8 725,279.6 C722.2,282.7 717.9,284.7 713.5,284.8 " +
  "C707.7,285.0 697.4,282.0 693.3,277.2 C689.2,272.3 692.4,256.7 689.1,255.4 " +
  "C686.4,254.4 678.9,260.0 677.4,264 C675.7,268.6 684.2,279.4 681.9,282.6 " +
  "C679.7,285.6 670.0,286.5 665.4,283.9 C658.9,280.2 656.5,259.8 651,254.3 " +
  "C647.7,251.0 643.0,252.1 640.4,249 C637.1,245.2 637.6,231.9 634.8,231.4 " +
  "C632.0,230.9 625.9,246.6 623.8,246.3 C622.5,246.1 623.3,241.6 621.7,240.1 " +
  "C619.7,238.2 614.9,237.0 611.2,237.3 C606.8,237.6 602.6,243.1 597,243.6 " +
  "C589.3,244.3 573.3,241.5 568.9,236.7 C565.9,233.4 565.5,227.3 566.7,223.5 " +
  "C567.9,219.8 574.2,217.8 575.8,214.1 C577.3,210.6 578.3,204.8 576.3,202.1 " +
  "C574.0,199.1 565.0,196.9 561.2,198.2 C557.9,199.3 557.5,205.4 554.2,207.4 " +
  "C550.4,209.7 544.4,210.5 539.2,210.1 C533.3,209.6 525.3,207.1 520.9,203.6 " +
  "C517.1,200.6 517.0,193.8 513.3,191.8 C509.4,189.7 501.9,194.0 497.9,191.9 " +
  "C493.8,189.8 493.4,181.9 489.1,179 C484.0,175.5 470.7,178.2 468.1,174.2 " +
  "C465.8,170.7 472.7,160.9 471,158.4 C469.9,156.7 465.7,158.7 464.1,157 " +
  "C461.5,154.4 460.4,144.0 461.3,140.1 C461.9,137.8 465.5,136.7 465,135 " +
  "C463.9,131.5 446.5,125.6 438.6,125 C432.4,124.5 427.1,126.0 421.5,128.7 " +
  "C414.9,131.9 407.4,143.1 402.3,144.2 C399.4,144.8 397.6,143.8 394.9,142.3 " +
  "C390.4,139.8 382.2,132.6 379.6,127.6 C377.7,124.0 379.5,120.1 377.9,116.8 " +
  "C376.1,113.1 371.9,108.4 368.5,106.8 C365.9,105.5 361.9,107.4 360.3,106 " +
  "C358.9,104.8 357.8,100.9 358.5,99.9 C359.0,99.1 362.2,99.9 362.3,99.3 " +
  "C362.5,98.4 357.5,94.9 354.3,94 C350.4,92.9 344.9,95.5 340.2,94.2 " +
  "C334.7,92.6 328.8,84.7 323.7,83.6 C319.9,82.8 316.8,86.0 312.9,85.4 " +
  "C307.7,84.6 296.4,79.4 295.8,76.3 C295.4,74.4 300.9,71.9 300.4,70.6 " +
  "C299.8,69.0 292.8,70.6 289.8,68.6 C286.1,66.1 286.1,58.7 281,54.9 " +
  "C272.5,48.6 240.4,48.8 237.4,42.9 C235.9,40.0 241.9,36.0 241.1,33 " +
  "C240.1,29.5 231.4,27.6 229.6,23.8 C227.9,20.2 231.8,12.7 229.7,11 " +
  "C227.7,9.3 222.7,14.0 217.4,13.7 C207.5,13.2 175.1,0.0 175.1,0 Z";

// The 5 real waypoints, projected with the same equirectangular transform
// used for the outline above (same 915x460 space, so they land in their
// true relative positions on the shape rather than being hand-placed).
export const FALLBACK_WAYPOINTS = [
  { x: 12.3, y: 170.2, dx: 14, dy: -8, anchor: "start" as const },
  { x: 174.8, y: 269, dx: 0, dy: 28, anchor: "middle" as const },
  { x: 491.6, y: 311, dx: 0, dy: -16, anchor: "middle" as const },
  { x: 558.8, y: 338.8, dx: 14, dy: 24, anchor: "start" as const },
  { x: 913, y: 430, dx: -14, dy: -8, anchor: "end" as const },
].map((point, index) => ({ ...point, label: WAYPOINTS[index].label, at: WAYPOINTS[index].at }));

// Straight segments with rounded joins at each town — deliberately not a
// globally-fitted spline (which overshoots/loops when segments are this
// unevenly spaced), just the highway bending at each stop along the way.
export const FALLBACK_ROUTE_PATH =
  "M12.3,170.2 Q70,192 129,228 Q174.8,269 200.6,272.4 " +
  "L465.8,307.6 Q491.6,311 515.6,320.9 " +
  "L534.8,328.9 Q558.8,338.8 584.0,345.3 " +
  "L913,430";
