"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

type DiagonalRevealProps = {
  children: ReactNode;
  className?: string;
  color?: string;
};

// Ported from the DiagonalSection pattern in project-run-1 (itself lifted
// from a Framer template): a skewed, coloured panel sits behind this
// section's own top edge and slides up into place as the section scrolls
// into view, so it visually sweeps over whatever's still pinned above it
// instead of just cutting to the next section.
//
// The wipe has to fully SETTLE to flat (skew back to 0, no residual slide)
// while the section is still entering from below — project-run-1's own
// section is tall enough that its readable content only appears well after
// its 834px transition zone has scrolled past, and that template holds its
// panel at full skew afterwards since it's meant as a permanent diagonal
// accent behind that content. Ours can't do that: the ticker's panel is
// only as tall as the ticker itself, so once scrollYProgress clamps to 1
// past "start 65%", a skew held there forever leaves a permanently slanted
// trailing edge sitting in front of whatever comes next — invisible while
// this panel and the map above it were both black, but a stray diagonal cut
// the moment the page past the ticker turns light. So this animates the
// OTHER direction: maximally skewed at progress 0 (still off-screen, nothing
// to see yet), flattening to skewY:0 / y:0 by "start 65%" — settled into a
// plain rectangle before it's readable, and staying that plain rectangle for
// the rest of the scroll. Oversizing the panel in globals.css
// (`.diagonal-reveal-overlap`) gives the skew room to swing through that
// entrance without ever exposing a real edge.
export default function DiagonalReveal({
  children,
  className = "",
  color = "#ffffff",
}: DiagonalRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 65%"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : -60, 0]);
  const skewY = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : -6, 0]);

  return (
    <div ref={sectionRef} className={`diagonal-reveal ${className}`}>
      <div className="diagonal-reveal-overlap" aria-hidden="true">
        <motion.div
          className="diagonal-reveal-fill"
          style={{ y, skewY, backgroundColor: color }}
        />
      </div>

      <div className="diagonal-reveal-content">{children}</div>
    </div>
  );
}
