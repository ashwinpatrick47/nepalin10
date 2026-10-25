"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

// Full, round "neon sign" heart (symmetric, plump lobes — not the earlier
// hand-drawn asymmetric version) — drawn live as the section scrolls into
// view via framer-motion's pathLength, rather than a static icon. See
// TopographicMap.tsx for this site's other "line draws itself on scroll"
// pattern; this one uses framer-motion's built-in pathLength instead of
// that component's manual dasharray math, since there's no need here for a
// point-on-path marker to track along it. One clean line, not a sketchy
// multi-stroke drawing — the neon look (four stacked glow layers below) is
// where the richness lives.
const HEART_PATH =
  "M100,172 C55,138 18,104 11,66 C5,34 24,9 53,9 C73,9 90,22 100,42 C110,22 127,9 147,9 C176,9 195,34 189,66 C182,104 145,138 100,172 Z";

// Small embers drifting up past the heart once it's drawn — positions/
// timings are fixed (not Math.random()) so server and client render the
// same markup; the organic feel comes from each having its own offset and
// duration, not from true randomness.
const EMBERS = [
  { left: "14%", delay: 0, duration: 5.2, size: 4 },
  { left: "28%", delay: 1.4, duration: 6.4, size: 3 },
  { left: "46%", delay: 2.6, duration: 5.8, size: 5 },
  { left: "60%", delay: 0.7, duration: 6.9, size: 3 },
  { left: "76%", delay: 2.1, duration: 5.4, size: 4 },
  { left: "88%", delay: 3.4, duration: 7.2, size: 3 },
];

const DONATION_LINKS = [
  {
    label: "Donate to Nepal Heart Foundation",
    href: "#",
  },
  {
    label: "Support the flood relief fund",
    href: "#",
  },
];

export default function Donation() {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Finishes early in the section's scroll range so the heart is already
  // whole by the time the rest of the section (CTAs included) has scrolled
  // into view, rather than still being drawn once everything below it is
  // already visible.
  const pathLength = useTransform(scrollYProgress, [0.04, 0.26], [0, 1]);
  const heartOpacity = useTransform(scrollYProgress, [0.02, 0.08], [0, 1]);

  return (
    <div className="donation-section" ref={sectionRef} id="donate">
      <TextStagger as="span" className="narrative-kicker" text="Give back" />
      <TextStagger
        as="h2"
        className="donation-heading"
        startDelay={0.15}
        lines={["Every step", <em key="em">draws a heartbeat.</em>]}
      />
      <CinematicTextReveal className="donation-body" delay={0.3}>
        <p>
          This run doesn&rsquo;t end at the finish line. A share of every
          mile goes straight to Nepal Heart Foundation&rsquo;s flood relief
          work — heart screenings, early detection, and care for the
          communities the route runs through.
        </p>
      </CinematicTextReveal>

      <motion.div
        className="donation-heart-wrap"
        style={reduceMotion ? undefined : { opacity: heartOpacity }}
      >
        {!reduceMotion && (
          <div className="donation-embers" aria-hidden="true">
            {EMBERS.map((ember, i) => (
              <span
                key={i}
                className="donation-ember"
                style={
                  {
                    left: ember.left,
                    "--ember-size": `${ember.size}px`,
                    "--ember-delay": `${ember.delay}s`,
                    "--ember-duration": `${ember.duration}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
        <svg
          className="donation-heart"
          viewBox="0 0 200 182"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="donationHeartGlowSoft"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter
              id="donationHeartGlowMed"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <filter
              id="donationHeartGlowTight"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="1.8" />
            </filter>
          </defs>
          {/* Four layers building one neon tube: wide soft bloom, medium
              bloom, a tight saturated glow, then a white-hot core on top —
              all sharing the same draw progress so it reads as a single
              line lighting up, not separate strokes. */}
          <motion.path
            d={HEART_PATH}
            className="donation-heart-glow donation-heart-glow-soft"
            style={
              reduceMotion
                ? undefined
                : { pathLength, filter: "url(#donationHeartGlowSoft)" }
            }
          />
          <motion.path
            d={HEART_PATH}
            className="donation-heart-glow donation-heart-glow-med"
            style={
              reduceMotion
                ? undefined
                : { pathLength, filter: "url(#donationHeartGlowMed)" }
            }
          />
          <motion.path
            d={HEART_PATH}
            className="donation-heart-glow donation-heart-glow-tight"
            style={
              reduceMotion
                ? undefined
                : { pathLength, filter: "url(#donationHeartGlowTight)" }
            }
          />
          <motion.path
            d={HEART_PATH}
            className="donation-heart-core"
            style={reduceMotion ? undefined : { pathLength }}
          />
        </svg>
      </motion.div>

      <motion.div
        className="donation-ctas"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      >
        <a
          className="donation-cta donation-cta-primary"
          href={DONATION_LINKS[0].href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="donation-cta-fill" aria-hidden="true" />
          <span className="donation-cta-label">{DONATION_LINKS[0].label}</span>
          <span className="donation-cta-circle" aria-hidden="true">
            <span className="donation-cta-arrow">&#8594;</span>
          </span>
        </a>
        <a
          className="donation-cta donation-cta-secondary"
          href={DONATION_LINKS[1].href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="donation-cta-fill" aria-hidden="true" />
          <span className="donation-cta-label">{DONATION_LINKS[1].label}</span>
          <span className="donation-cta-circle" aria-hidden="true">
            <span className="donation-cta-arrow">&#8594;</span>
          </span>
        </a>
      </motion.div>
    </div>
  );
}
