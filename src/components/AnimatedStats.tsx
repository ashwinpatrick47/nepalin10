"use client";

import { useEffect, useRef, useState } from "react";

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

  return (
    <span className="story-stat-digit" aria-hidden="true">
      <span
        className="story-stat-digit-track"
        style={{
          transform: isActive
            ? `translate3d(0, -${destination * reelStep}em, 0)`
            : "translate3d(0, 0, 0)",
          transitionDelay: `${delay}ms`,
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

  return (
    <div ref={containerRef} className="story-stats" aria-label="Journey details">
      {stats.map((stat, statIndex) => (
        <div
          key={`${stat.number}-${stat.label}`}
          className={`story-stat-item${isActive ? " is-visible" : ""}`}
          style={{ transitionDelay: `${statIndex * staggerDelay}ms` }}
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
