"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type mapboxgl from "mapbox-gl";
import {
  WAYPOINTS,
  ROUTE_GEOJSON,
  pointAlongRoute,
  bearingBetween,
  FALLBACK_OUTLINE,
  FALLBACK_WAYPOINTS,
  FALLBACK_ROUTE_PATH,
} from "./terrainRoute";

export type TopographicMapHandle = {
  /** Drive the camera + route + runner from the flight-phase progress, 0-1. */
  update: (t: number) => void;
  /** Draw the route + runner only, from 0-1 — camera stays put, no zoom/pan/bank. */
  drawRoute: (t: number) => void;
};

export type TerrainFrame = {
  label: string;
  km: number;
};

type TopographicMapProps = {
  onFrame?: (frame: TerrainFrame) => void;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Layers we strip from the outdoors style so it reads as a quiet editorial
// contour map, not a navigable Google-Maps-style basemap.
function stripToTerrain(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    const isSymbol = layer.type === "symbol";
    const isRoadOrBuilding = /road|bridge|tunnel|building|admin|poi/.test(id);
    if (isSymbol || isRoadOrBuilding) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

export default forwardRef<TopographicMapHandle, TopographicMapProps>(
  function TopographicMap({ onFrame }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const mapLabelMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const mapDotMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const mapDistanceBadgeRef = useRef<HTMLSpanElement | null>(null);
    const mapReadyRef = useRef(false);
    const [mapboxAvailable] = useState(() => Boolean(MAPBOX_TOKEN));

    // --- fallback (no-token) SVG refs ---
    const fallbackGroupRef = useRef<SVGGElement>(null);
    const fallbackRouteRef = useRef<SVGPathElement>(null);
    const fallbackHiddenPathRef = useRef<SVGPathElement>(null);
    const fallbackMarkerRef = useRef<SVGCircleElement>(null);
    const fallbackGlowRef = useRef<SVGCircleElement>(null);
    const fallbackLabelRefs = useRef<Array<SVGTextElement | null>>([]);
    const fallbackDotRefs = useRef<Array<SVGCircleElement | null>>([]);
    const fallbackDistanceRef = useRef<SVGTextElement>(null);
    const pathLengthRef = useRef(0);
    const vignetteRef = useRef<HTMLDivElement>(null);
    const lastFrameRef = useRef<TerrainFrame | null>(null);

    useEffect(() => {
      if (fallbackHiddenPathRef.current) {
        pathLengthRef.current = fallbackHiddenPathRef.current.getTotalLength();
      }
    }, []);

    useEffect(() => {
      if (!mapboxAvailable || !containerRef.current) return;
      let cancelled = false;

      import("mapbox-gl").then(async (mod) => {
        if (cancelled || !containerRef.current) return;
        await import("mapbox-gl/dist/mapbox-gl.css");
        const mapboxgl = mod.default;
        mapboxgl.accessToken = MAPBOX_TOKEN as string;

        const start = WAYPOINTS[0];
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/outdoors-v12",
          center: [start.lng, start.lat],
          zoom: 6.4,
          pitch: 0,
          bearing: 0,
          interactive: false,
          attributionControl: false,
        });
        map.addControl(new mapboxgl.AttributionControl({ compact: true }));

        map.on("load", () => {
          stripToTerrain(map);

          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
          map.setFog({
            range: [0.5, 10],
            color: "#0a100d",
            "horizon-blend": 0.25,
            "high-color": "#0d1512",
            "space-color": "#050706",
          });

          map.addSource("highway-route", {
            type: "geojson",
            data: ROUTE_GEOJSON,
          });
          map.addLayer({
            id: "highway-route-line",
            type: "line",
            source: "highway-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#e8ebe3",
              "line-width": 2.6,
              "line-opacity": 1,
            },
          });

          const markerEl = document.createElement("div");
          markerEl.className = "terrain-map-runner-marker";
          const distanceBadge = document.createElement("span");
          distanceBadge.className = "terrain-map-runner-km";
          distanceBadge.style.opacity = "0";
          markerEl.appendChild(distanceBadge);
          mapDistanceBadgeRef.current = distanceBadge;
          mapMarkerRef.current = new mapboxgl.Marker({ element: markerEl }).setLngLat([
            start.lng,
            start.lat,
          ]).addTo(map);

          mapDotMarkersRef.current = WAYPOINTS.map((point) => {
            const el = document.createElement("div");
            el.className = "terrain-map-waypoint-dot";
            return new mapboxgl.Marker({ element: el })
              .setLngLat([point.lng, point.lat])
              .addTo(map);
          });

          mapLabelMarkersRef.current = WAYPOINTS.map((point) => {
            const el = document.createElement("div");
            el.className = "terrain-map-label";
            el.textContent = point.label;
            el.style.opacity = "0";
            return new mapboxgl.Marker({ element: el, anchor: "left", offset: [8, 0] })
              .setLngLat([point.lng, point.lat])
              .addTo(map);
          });

          mapReadyRef.current = true;
        });

        mapRef.current = map;
      });

      return () => {
        cancelled = true;
        mapMarkerRef.current?.remove();
        mapMarkerRef.current = null;
        mapDistanceBadgeRef.current = null;
        mapLabelMarkersRef.current.forEach((marker) => marker.remove());
        mapLabelMarkersRef.current = [];
        mapDotMarkersRef.current.forEach((marker) => marker.remove());
        mapDotMarkersRef.current = [];
        mapRef.current?.remove();
        mapRef.current = null;
        mapReadyRef.current = false;
      };
    }, [mapboxAvailable]);

    useImperativeHandle(ref, () => {
      function drawRoute(t: number) {
        const point = pointAlongRoute(t);
        const waypoint = WAYPOINTS.find((w) => Math.abs(w.at - t) < 0.006);
        const label = waypoint?.label ?? currentSegmentLabel(t);

        WAYPOINTS.forEach((w, index) => {
          // The start-of-route label shouldn't appear until the line has
          // actually begun drawing — every other waypoint can reveal a
          // touch ahead of the line reaching it, mid-flight.
          const revealed = w.at === 0 ? t > 0.001 : t >= w.at - 0.001;
          const opacity = revealed ? "1" : "0";
          mapLabelMarkersRef.current[index]
            ?.getElement()
            .style.setProperty("opacity", opacity);
          mapDotMarkersRef.current[index]
            ?.getElement()
            .style.setProperty("opacity", opacity);
          const el = fallbackLabelRefs.current[index];
          if (el) el.style.opacity = opacity;
          const dotEl = fallbackDotRefs.current[index];
          if (dotEl) dotEl.style.opacity = opacity;
        });

        // Live "distance so far" readout, travels with the runner instead of
        // sitting fixed — only appears once the line has actually started.
        const distanceOpacity = t > 0.001 ? "1" : "0";
        const distanceText = `${point.km.toLocaleString()} KM`;

        if (mapboxAvailable) {
          const map = mapRef.current;
          if (map && mapReadyRef.current) {
            mapMarkerRef.current?.setLngLat([point.lng, point.lat]);
            if (mapDistanceBadgeRef.current) {
              mapDistanceBadgeRef.current.textContent = distanceText;
              mapDistanceBadgeRef.current.style.opacity = distanceOpacity;
            }
            const routeSource = map.getSource(
              "highway-route",
            ) as mapboxgl.GeoJSONSource | undefined;
            if (routeSource) {
              const coords = WAYPOINTS.map((w) => [w.lng, w.lat]);
              const drawnCount = Math.max(
                2,
                Math.round(1 + t * (coords.length - 1)),
              );
              routeSource.setData({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    ...coords.slice(0, drawnCount - 1),
                    [point.lng, point.lat],
                  ],
                },
              });
            }
          }
        } else {
          const len = pathLengthRef.current;
          if (len && fallbackRouteRef.current) {
            fallbackRouteRef.current.setAttribute("stroke-dasharray", `${len}`);
            fallbackRouteRef.current.setAttribute(
              "stroke-dashoffset",
              `${len * (1 - t)}`,
            );
            const p = fallbackHiddenPathRef.current?.getPointAtLength(len * t);
            if (p) {
              fallbackMarkerRef.current?.setAttribute("cx", `${p.x}`);
              fallbackMarkerRef.current?.setAttribute("cy", `${p.y}`);
              if (fallbackGlowRef.current) {
                fallbackGlowRef.current.setAttribute("cx", `${p.x}`);
                fallbackGlowRef.current.setAttribute("cy", `${p.y}`);
                fallbackGlowRef.current.style.opacity = t > 0.001 ? "1" : "0";
              }
              if (fallbackDistanceRef.current) {
                fallbackDistanceRef.current.setAttribute("x", `${p.x}`);
                // -26, not -12: a waypoint label can sit as close as -8/-16
                // above its own point, and the runner ends the route sitting
                // exactly on top of the final waypoint — too little
                // clearance here and the two texts collide at the finish.
                fallbackDistanceRef.current.setAttribute("y", `${p.y - 26}`);
                fallbackDistanceRef.current.textContent = distanceText;
                fallbackDistanceRef.current.style.opacity = distanceOpacity;
              }
            }
          }
        }

        const next = { label, km: point.km };
        const last = lastFrameRef.current;
        if (!last || last.label !== next.label || last.km !== next.km) {
          lastFrameRef.current = next;
          onFrame?.(next);
        }
      }

      return {
        drawRoute,
        update(t: number) {
          const point = pointAlongRoute(t);
          const ahead = pointAlongRoute(Math.min(1, t + 0.001));
          const bearing = bearingBetween(point, ahead);
          const ease = t * t * (3 - 2 * t);
          const zoom = 6.4 + ease * 2.6;
          const pitch = t < 0.06 ? (t / 0.06) * 55 : t > 0.94 ? 55 - ((t - 0.94) / 0.06) * 25 : 55;

          if (vignetteRef.current) {
            vignetteRef.current.style.opacity = `${0.25 + ease * 0.35}`;
          }

          if (mapboxAvailable) {
            const map = mapRef.current;
            if (map && mapReadyRef.current) {
              map.jumpTo({
                center: [point.lng, point.lat],
                zoom,
                pitch,
                bearing,
              });
            }
          } else {
            const svgPoint = fallbackPointAt(t);
            // Bank angle: a whisper of rotation in the direction of travel,
            // so the terrain feels flown-over rather than dragged.
            const aheadPoint = fallbackPointAt(Math.min(1, t + 0.02));
            const bank = Math.max(
              -4,
              Math.min(4, (aheadPoint.y - svgPoint.y) * 0.12),
            );
            if (fallbackGroupRef.current) {
              fallbackGroupRef.current.style.transform = `scale(${1 + ease * 0.55}) translate(${-svgPoint.x * ease * 0.35}px, ${-svgPoint.y * ease * 0.35}px) rotate(${bank * ease}deg)`;
            }
          }

          drawRoute(t);
        },
      };
    });

    if (!mapboxAvailable) {
      return (
        <div
          className="terrain-map terrain-map-fallback"
          aria-hidden="true"
        >
          <svg
            className="terrain-map-svg"
            viewBox="-91 -46 1097 552"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Clips the contour texture + ridge lines below to exactly
                  the country's own shape, so the terrain inside reads as
                  filled-in relief rather than a flat outline on black. */}
              <clipPath id="nepal-terrain-clip">
                <path d={FALLBACK_OUTLINE} />
              </clipPath>
              <pattern
                id="nepal-contour-pattern"
                width="64"
                height="46"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-12)"
              >
                <path
                  d="M-8,8 Q8,-4 24,8 T56,8 T88,8"
                  className="terrain-contour-line"
                />
                <path
                  d="M-8,24 Q8,12 24,24 T56,24 T88,24"
                  className="terrain-contour-line terrain-contour-line-soft"
                />
                <path
                  d="M-8,38 Q8,28 24,38 T56,38 T88,38"
                  className="terrain-contour-line"
                />
              </pattern>
              <radialGradient id="nepal-runner-glow">
                <stop offset="0%" stopColor="#ff0052" stopOpacity=".5" />
                <stop offset="100%" stopColor="#ff0052" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g ref={fallbackGroupRef} className="terrain-map-group">
              {/* Same texture, unclipped and much dimmer — extends the
                  terrain out past the border so Nepal reads as a
                  highlighted region within a wider landscape, not a shape
                  floating on an otherwise empty background. */}
              <rect
                x={-91}
                y={-46}
                width={1097}
                height={552}
                fill="url(#nepal-contour-pattern)"
                className="terrain-contour-backdrop"
              />
              <path className="terrain-map-outline" d={FALLBACK_OUTLINE} />
              <g clipPath="url(#nepal-terrain-clip)">
                <rect
                  x={-91}
                  y={-46}
                  width={1097}
                  height={552}
                  fill="url(#nepal-contour-pattern)"
                />
              </g>
              <path
                ref={fallbackHiddenPathRef}
                d={FALLBACK_ROUTE_PATH}
                fill="none"
                stroke="none"
              />
              <circle
                ref={fallbackGlowRef}
                className="terrain-runner-glow"
                cx={FALLBACK_WAYPOINTS[0].x}
                cy={FALLBACK_WAYPOINTS[0].y}
                r={42}
                fill="url(#nepal-runner-glow)"
                style={{ opacity: 0 }}
              />
              <path
                ref={fallbackRouteRef}
                className="terrain-map-route"
                d={FALLBACK_ROUTE_PATH}
              />
              {FALLBACK_WAYPOINTS.map((point, index) => (
                <circle
                  key={`dot-${point.label}`}
                  ref={(el) => {
                    fallbackDotRefs.current[index] = el;
                  }}
                  className="terrain-map-waypoint-dot"
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  style={{ opacity: 0 }}
                />
              ))}
              <circle
                ref={fallbackMarkerRef}
                className="terrain-map-runner"
                cx={FALLBACK_WAYPOINTS[0].x}
                cy={FALLBACK_WAYPOINTS[0].y}
                r={5.5}
              />
              <text
                ref={fallbackDistanceRef}
                className="terrain-map-runner-km"
                x={FALLBACK_WAYPOINTS[0].x}
                y={FALLBACK_WAYPOINTS[0].y - 26}
                textAnchor="middle"
                style={{ opacity: 0 }}
              >
                0 KM
              </text>
              {FALLBACK_WAYPOINTS.map((point, index) => (
                <text
                  key={point.label}
                  ref={(el) => {
                    fallbackLabelRefs.current[index] = el;
                  }}
                  className="terrain-map-label"
                  x={point.x + point.dx}
                  y={point.y + point.dy}
                  textAnchor={point.anchor}
                  style={{ opacity: 0 }}
                >
                  {point.label}
                </text>
              ))}
            </g>
          </svg>
          <div ref={vignetteRef} className="terrain-vignette" />
        </div>
      );
    }

    return (
      <div className="terrain-map">
        <div ref={containerRef} className="terrain-map-canvas" />
        <div ref={vignetteRef} className="terrain-vignette" />
      </div>
    );
  },
);

function currentSegmentLabel(t: number) {
  let label = WAYPOINTS[0].label;
  for (const w of WAYPOINTS) {
    if (t >= w.at) label = w.label;
  }
  return label;
}

function fallbackPointAt(t: number) {
  const index = Math.min(
    FALLBACK_WAYPOINTS.length - 1,
    Math.floor(t * (FALLBACK_WAYPOINTS.length - 1)),
  );
  return FALLBACK_WAYPOINTS[index];
}
