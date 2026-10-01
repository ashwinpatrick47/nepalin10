"use client";

import SiteImage from "@/components/SiteImage";
import { useEffect } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { cldImageUrl } from "@/lib/cloudinary";

// The hero images the very first reveal shows, all marked `priority` where
// they're actually rendered (himalayanParallax.tsx) so the browser already
// starts fetching them on first paint — this just makes sure the loading
// screen's own time is spent waiting on that fetch, not an arbitrary fixed
// duration unrelated to it. cldImageUrl() with no width arg matches exactly
// what SiteImage resolves these same paths to, so this is preloading the
// actual URL that'll be requested, not a guess at it.
const CRITICAL_HERO_IMAGES = [
  "/images/logo/rara.png",
  "/images/logo/title.png",
  "/images/himalaya-clouds.jpg",
  "/images/mountains-foreground.png",
  "/images/monastery-foreground.png",
].map((path) => cldImageUrl(path));

// A connection too slow to finish these in MAX_WAIT_MS shouldn't strand the
// user on the loading screen indefinitely — better to reveal with a couple
// of images still finishing than to never reveal at all.
const MAX_WAIT_MS = 6000;

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // a failed/missing asset shouldn't hold up the reveal either
    img.src = src;
  });
}

function waitForCriticalImages(): Promise<void> {
  const loaded = Promise.all(CRITICAL_HERO_IMAGES.map(preloadImage)).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));
  return Promise.race([loaded, timeout]);
}

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

    // Started immediately, in parallel with the logo fade-in below — not
    // awaited until the hold step, so the fetch and the animation overlap
    // instead of the fetch only starting once the animation's caught up.
    const criticalImagesReady = waitForCriticalImages();

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

      // Holds for at least 800ms (same minimum as before, so a fast/cached
      // load still feels like a deliberate pause rather than a flash), but
      // extends — up to MAX_WAIT_MS — until the hero's own background
      // images have actually finished downloading. Without this, the
      // overlay was fading away on a fixed clock with no relationship to
      // whether there was anything ready underneath it yet; on a slow
      // connection the hero could reveal to images still popping in.
      await Promise.all([new Promise((resolve) => setTimeout(resolve, 800 * speed)), criticalImagesReady]);
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
          <SiteImage
            src="/images/logo/rara.png"
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
