"use client";

import { useEffect, useRef } from "react";
import TextReveal, { type TextRevealHandle } from "./TextReveal";
import TopographicMap, { type TopographicMapHandle } from "./TopographicMap";

// A short version of TerrainSequence's opening beat, same mechanism: a
// scrim (not the map's own opacity) covers the always-visible map, text
// pulls back from a giant scale while the scrim lifts, then — once the
// pullback resolves — the remaining scroll draws the route in. The one
// deliberate difference is drawRoute() instead of update(): camera
// zoom/pan is reserved for the real TerrainSequence further down the page,
// so this stays a static, complete view of the terrain. No pinning — this
// rides CSS position:sticky so it scrolls as one continuous piece rather
// than a separate locked moment. Standing in for what used to be the
// Nepali/English manifesto section. The "NEPAL IN 10" ticker (MapLabels)
// used to render as a sibling right after this — it's since moved to
// RunnerChapter's background strip, see RunnerChapter.tsx.
const PULLBACK_END = 0.35;
const TEXT_FADE_START = 0.78; // fraction of the pullback itself
// Smaller than TerrainSequence's 4.6 — at that scale this two-line heading
// is taller than the viewport, so the second line starts off-screen and
// only "appears" once the block has shrunk enough to fit, reading as a
// separate, abrupt text rather than one continuous reveal.
const START_SCALE = 3.3;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export default function ManifestoReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<TextRevealHandle>(null);
  const mapRef = useRef<TopographicMapHandle>(null);

  const applyProgress = (p: number) => {
    const pullT = clamp01(p / PULLBACK_END);
    const ease = smoothstep(pullT);

    const scale = START_SCALE - ease * (START_SCALE - 1);
    // Temporarily disabled per request — text stays fully opaque instead of
    // fading out past TEXT_FADE_START. Restore the commented block below to
    // bring the fade back.
    const opacity = 1;
    // const opacity =
    //   pullT <= TEXT_FADE_START
    //     ? 1
    //     : 1 - (pullT - TEXT_FADE_START) / (1 - TEXT_FADE_START);
    textRef.current?.apply(scale, opacity);

    if (scrimRef.current) {
      scrimRef.current.style.opacity = `${1 - ease}`;
    }

    const routeT =
      p <= PULLBACK_END ? 0 : clamp01((p - PULLBACK_END) / (1 - PULLBACK_END));
    mapRef.current?.drawRoute(routeT);
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      const rafId = requestAnimationFrame(() => applyProgress(0.6));
      return () => cancelAnimationFrame(rafId);
    }

    let scrollTrigger: import("gsap/ScrollTrigger").ScrollTrigger | undefined;
    let cancelled = false;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (cancelled || !sectionRef.current) return;
        gsap.registerPlugin(ScrollTrigger);

        // No `pin` — positioning is handled by .manifesto-sticky
        // (position:sticky), avoiding the dead-scroll-space a GSAP
        // pin-spacer would need. This ScrollTrigger exists purely to drive
        // progress with the same scrub engine TerrainSequence uses.
        scrollTrigger = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => applyProgress(self.progress),
        });
      },
    );

    return () => {
      cancelled = true;
      scrollTrigger?.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} className="manifesto-reveal">
      <div className="manifesto-sticky">
        <div className="terrain-map-layer">
          <TopographicMap ref={mapRef} />
        </div>

        <div ref={scrimRef} className="terrain-scrim" />

        <TextReveal ref={textRef} startScale={START_SCALE}>
          REDEFINING LIMITS,
          <br />
          <em>FIGHTING FOR WINS.</em>
        </TextReveal>
      </div>
    </section>
  );
}
