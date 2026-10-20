"use client";

import { useEffect, useRef, useState } from "react";

// The digit track's transform is only actually moving for the 2.25s the CSS
// transition (globals.css .story-stat-digit-track) takes to run, once, the
// first time this scrolls into view — after that it sits still forever.
// will-change was previously hard-coded permanently in that CSS rule, so
// every digit on the page (there are several per stat) stayed its own
// promoted compositor layer for the rest of the session. Matches the same
// settle-then-release pattern as TextStagger.
const DIGIT_TRANSITION_MS = 2250;

type Stat = {
  number: string;
  label: string;
};

type AnimatedStatsProps = {
  stats: readonly Stat[];
  staggerDelay?: number;
};

const DIGITS = Array.from({ length: 20 }, (_, index) => index % 10);

function RollingDigit({
  digit,
  delay,
  isActive,
}: {
  digit: string;
  delay: number;
  isActive: boolean;
}) {
  const destination = 10 + Number(digit);
  const reelStep = 1.16;
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setTimeout(() => setSettled(true), delay + DIGIT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isActive, delay]);

  return (
    <span className="story-stat-digit" aria-hidden="true">
      <span
        className="story-stat-digit-track"
        style={{
          transform: isActive
            ? `translate3d(0, -${destination * reelStep}em, 0)`
            : "translate3d(0, 0, 0)",
          transitionDelay: `${delay}ms`,
          willChange: isActive && !settled ? "transform" : "auto",
        }}
      >
        {DIGITS.map((value, index) => (
          <span key={`${value}-${index}`}>{value}</span>
        ))}
      </span>
    </span>
  );
}

export default function AnimatedStats({
  stats,
  staggerDelay = 180,
}: AnimatedStatsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsActive(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // .story-stat-item's opacity/transform fade-in (globals.css) plays once —
  // last item finishes at (stats.length-1)*staggerDelay + its own .9s
  // transition. will-change is released once every item has settled rather
  // than staying hard-coded in the CSS forever (see TextStagger for why).
  useEffect(() => {
    if (!isActive) return;
    const timer = window.setTimeout(
      () => setSettled(true),
      (stats.length - 1) * staggerDelay + 900,
    );
    return () => window.clearTimeout(timer);
  }, [isActive, stats.length, staggerDelay]);

  return (
    <div ref={containerRef} className="story-stats" aria-label="Journey details">
      {stats.map((stat, statIndex) => (
        <div
          key={`${stat.number}-${stat.label}`}
          className={`story-stat-item${isActive ? " is-visible" : ""}`}
          style={{
            transitionDelay: `${statIndex * staggerDelay}ms`,
            willChange: settled ? "auto" : "opacity, transform",
          }}
        >
          <strong className="story-stat-number" aria-label={stat.number}>
            {stat.number.split("").map((digit, digitIndex) => (
              <RollingDigit
                key={`${digit}-${digitIndex}`}
                digit={digit}
                isActive={isActive}
                delay={180 + statIndex * staggerDelay + digitIndex * 75}
              />
            ))}
          </strong>
          <span className="story-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
