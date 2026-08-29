"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";

// Ported from the Framer marketplace component at framer.com/m/Preloader-1
// — same sequence: overlay in front of everything, centre content fades in
// (blur→sharp), holds, fades back out (sharp→blur), then the whole overlay
// blurs/fades away. Their version takes a text string + a cycling image
// card; this one only needs the Rara Runs Nepal mark in the centre, no
// image card.
//
// Takes over the intro contract SmoothScroll (smoothScroll.tsx) expects:
// dispatch a "hima:intro-complete" window event once the sequence finishes,
// same as the old fog-loader used to on its own CSS animation's end. Every
// hero element gated behind html.hima-intro already carries its own
// opacity/transform transition (see globals.css ~line 20-90), so removing
// hima-intro at that point is enough for the hero to settle in smoothly —
// no separate "start revealing under the overlay" step needed the way the
// old fog loader had one, since this overlay stays fully opaque the whole
// time instead of dispersing gradually.
const SPEED = 1; // 1 = normal; matches the Framer component's "animationSpeed" control

export default function Preloader() {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      window.dispatchEvent(new Event("hima:intro-complete"));
      return;
    }

    let cancelled = false;
    const speed = 1 / SPEED;

    const playSequence = async () => {
      // The logo's hidden starting point is set declaratively in the JSX
      // style below, not via an imperative duration:0 animate() call here —
      // that fire-and-forget reset raced the very next awaited animate()
      // call on the same selector and reliably lost, so the logo rendered
      // fully visible from frame one instead of fading in.
      await animate(
        ".preloader-logo",
        { opacity: 1, filter: "brightness(0) blur(0px)" },
        { duration: 1.5 * speed, ease: "easeOut", delay: 0.2 * speed },
      );
      if (cancelled) return;

      await new Promise((resolve) => setTimeout(resolve, 800 * speed));
      if (cancelled) return;

      await animate(
        ".preloader-logo",
        { opacity: 0, filter: "brightness(0) blur(10px)" },
        { duration: 0.5 * speed, ease: "easeIn" },
      );
      if (cancelled) return;

      // Dispatched here — right as this last fade starts, not after it
      // finishes. hima-intro's removal is what lets the hero's own
      // header/title/mark transitions begin (they're gated behind it in
      // globals.css); starting that at the same moment this overlay begins
      // dissolving means the mountains and the hero text arrive together
      // instead of the mountains showing through an already-fading overlay
      // for a beat before the text even starts moving.
      window.dispatchEvent(new Event("hima:intro-complete"));

      await animate(
        ".preloader-overlay",
        { opacity: 0, filter: "blur(20px)" },
        { duration: 1 * speed, ease: "easeInOut" },
      );
      if (cancelled) return;

      animate(".preloader-overlay", { display: "none" }, { duration: 0 });
    };

    playSequence();

    return () => {
      cancelled = true;
    };
  }, [reduceMotion, animate]);

  if (reduceMotion) return null;

  return (
    <div ref={scope} className="preloader-root" aria-hidden="true">
      <div className="preloader-overlay">
        {/* Same light fog gradient the old loader used — kept as a separate
            blurred layer so the blur doesn't also hit the logo above it. */}
        <div className="preloader-bg" />
        <div
          className="preloader-logo"
          style={{ opacity: 0, filter: "brightness(0) blur(10px)" }}
        >
          <Image
            src="/icons/rara.png"
            alt=""
            fill
            priority
            sizes="180px"
          />
        </div>
      </div>
    </div>
  );
}
