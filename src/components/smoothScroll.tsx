"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import type Lenis from "lenis";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

// Other components (e.g. Footer's Quick Links) need to drive scroll through
// this same Lenis instance rather than calling the native window.scrollTo —
// Lenis owns the scroll position via its own rAF loop and will fight/override
// any scroll a caller sets natively. There's no React context reaching them
// (ReactLenis here renders with no children, it's a sibling of the page
// content in layout.tsx), so the instance is handed off on `window` instead.
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll() {
  const reduceMotion = useReducedMotion();
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const root = document.documentElement;
    window.__lenis = lenisRef.current?.lenis;

    // A hash in the URL on first load (e.g. arriving from /shop's "Foundation"
    // link, which points to "/#foundation") would normally be handled by the
    // browser's native fragment-navigation — but that's wiped out below by
    // forcing the scroll to 0 while the intro plays, and html.hima-intro sets
    // overflow:hidden anyway, which blocks it outright. So it's parked here
    // and replayed once the intro actually finishes.
    const pendingHash = window.location.hash;
    const scrollToHash = (immediate: boolean) => {
      if (!pendingHash || pendingHash.length < 2) return;
      const target = document.getElementById(pendingHash.slice(1));
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      const lenis = lenisRef.current?.lenis;
      if (lenis) lenis.scrollTo(top, { immediate, force: true });
      else window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
    };

    if (reduceMotion) {
      root.classList.remove("hima-intro");
      root.classList.remove("hima-assets-ready", "hima-reveal");
      scrollToHash(true);
      return;
    }

    if (root.classList.contains("hima-intro")) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true });
    }

    const sync = () => {
      const loading = root.classList.contains("hima-intro");
      if (loading) lenisRef.current?.lenis?.stop();
      else lenisRef.current?.lenis?.start();
    };

    const finishIntro = () => {
      root.classList.remove("hima-intro");
      root.classList.remove("hima-assets-ready", "hima-reveal");
      sync();
      scrollToHash(false);
    };

    const frame = requestAnimationFrame(sync);
    const fallback = window.setTimeout(finishIntro, 4500);
    window.addEventListener("hima:intro-complete", finishIntro, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      window.removeEventListener("hima:intro-complete", finishIntro);
      root.classList.remove("hima-intro");
      root.classList.remove("hima-assets-ready", "hima-reveal");
      window.__lenis = undefined;
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        autoRaf: true,
        // Was 0.085 — exponential-lerp smoothing like this keeps nudging
        // the scroll position toward its target for roughly
        // -ln(threshold)/lerp frames after each wheel tick, so a lower
        // value doesn't just feel "floatier", it makes every scroll input
        // keep the whole page (every continuous parallax transform, every
        // framer-motion scroll subscriber) actively recomputing and
        // repainting for noticeably longer after the user's hand has
        // already stopped moving. At 0.085 that tail is ~35 frames (~0.6s)
        // to settle within 5% of target; at 0.15 it's ~20 frames (~0.33s)
        // — roughly 40% less sustained per-frame work for the same scroll,
        // compounding with how much this page has running on every frame.
        // Only affects desktop wheel input — touch (mobile) already uses
        // native scroll physics by default (syncTouch defaults to false).
        lerp: 0.15,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        anchors: true,
        stopInertiaOnNavigate: true,
      }}
    />
  );
}
