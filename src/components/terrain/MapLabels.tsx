"use client";

import { Fragment } from "react";
import DiagonalReveal from "@/components/DiagonalReveal";
import { NEPAL_COORDINATES } from "./terrainRoute";

// A normal, in-flow section — same mechanism topography.webflow.io actually
// uses for its own marquee band (verified directly: position:relative,
// clip-path:none, transform:none, plain document flow). No pin, no
// scroll-scrubbed reveal, no clip-path trick: it just scrolls into view like
// any other section on the page. Wrapped in DiagonalReveal so its own
// backdrop visibly sweeps up over the still-pinned map as it scrolls into
// view, instead of just cutting to the next section — same black as the
// map itself, so the ticker still reads as part of that dark scene; the
// page doesn't turn light until further down (see --scene-t in
// himalayanParallax.tsx). The text itself is static, not wrapped in
// CinematicTextReveal — it's plainly visible the first time it scrolls
// into view rather than fading up.

// Alternates English and Nepali so the chain reads NEPAL IN 10 / coords /
// नेपाल १० दिनमा / coords / ... — same phrase, two languages, one chain.
const TICKER_PHRASES = ["NEPAL IN 10", "नेपाल १० दिनमा"];
// Repeated enough times that a doubled-width track never runs out of copy,
// however wide the viewport — the CSS animation pans it by a flat 50%, so
// the remaining half must still be full of copy for the loop to be seamless.
const TICKER_REPEAT = 8;

export default function MapLabels() {
  return (
    <DiagonalReveal className="terrain-ticker-diagonal" color="#060908">
      <div className="terrain-ticker">
        <div className="terrain-ticker-track">
          {Array.from({ length: TICKER_REPEAT }).map((_, index) => {
            const phraseIndex = index % TICKER_PHRASES.length;
            const isNepali = phraseIndex === 1;
            return (
              <Fragment key={index}>
                <span
                  className={`terrain-ticker-item${isNepali ? " terrain-ticker-item-nepali" : ""}`}
                >
                  {TICKER_PHRASES[phraseIndex]}
                </span>
                <span className="terrain-ticker-coord">{NEPAL_COORDINATES}</span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </DiagonalReveal>
  );
}
