"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

export default function SmoothScroll() {
  const reduceMotion = useReducedMotion();
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (reduceMotion) {
      root.classList.remove("hima-intro");
      return;
    }

    if (root.classList.contains("hima-intro")) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    const sync = () => {
      const loading = root.classList.contains("hima-intro");
      if (loading) lenisRef.current?.lenis?.stop();
      else lenisRef.current?.lenis?.start();
    };

    const finishIntro = () => {
      root.classList.remove("hima-intro");
      sync();
    };

    const frame = requestAnimationFrame(sync);
    const fallback = window.setTimeout(finishIntro, 4500);
    window.addEventListener("hima:intro-complete", finishIntro, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      window.removeEventListener("hima:intro-complete", finishIntro);
      root.classList.remove("hima-intro");
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        autoRaf: true,
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        anchors: true,
        stopInertiaOnNavigate: true,
      }}
    />
  );
}
