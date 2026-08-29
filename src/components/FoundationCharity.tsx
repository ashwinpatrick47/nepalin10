"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

// Two-column layout — copy on the left, the photo pile on the right — with
// the pile ported from project-run-1's ProjectGrid/ProjectCard: each card is
// `position: sticky` at its own small top offset (so it catches and holds
// while the next card scrolls up from below and buries it, growing the pile
// as you scroll), one image per card, and a whileInView clip-path/fade
// entrance. Each buried card also shrinks toward its own resting scale
// (Math.min(1, 0.76 + index*0.08), the reference's exact formula) as the
// shared scroll progress advances, so earlier photos visibly recede/shrink
// back behind the current front card instead of staying edge-to-edge with
// it — that recession is the point, not a misalignment bug. The copy
// column is sticky too (see .foundation-copy), so the heading/body/CTA
// hold in place for the whole time the pile is still building beside them,
// rather than scrolling off before it finishes.
// Only 3 of these are unique to this stack (mountains/monastery/valley);
// clouds and the flag are reused from elsewhere on the site (WhyNepal) —
// there wasn't enough distinct photography to fill 5 cards otherwise, and
// the user opted to reuse rather than trim the pile back down to 3.
const STACK_IMAGES: readonly { src: string; alt: string }[] = [
  { src: "/images/himalaya-mountains.jpg", alt: "" },
  { src: "/images/monastery-hero.png", alt: "" },
  { src: "/images/himalayan-valley.png", alt: "" },
  { src: "/images/himalaya-clouds.jpg", alt: "" },
  { src: "/images/flag-nepal.jpg", alt: "" },
];

function FoundationStackCard({
  image,
  index,
  progress,
  isMobile,
}: {
  image: (typeof STACK_IMAGES)[number];
  index: number;
  progress: MotionValue<number>;
  isMobile: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const restingScale = Math.min(1, 0.76 + index * 0.08);
  const visualScale = useTransform(progress, [0, 1], reduceMotion || isMobile ? [1, 1] : [1, restingScale]);

  // On mobile the pile collapses to plain stacked cards (no sticky pinning,
  // no scale-recede — see isMobile above), so each card gets its own small
  // scroll-linked y-parallax instead, matching the image movement WhyNepal
  // and Testimonials already have elsewhere on the site. Scoped to this
  // card's own scroll range (not the shared pile progress) since each card
  // now scrolls through the viewport independently in normal flow.
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: cardProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    cardProgress,
    [0, 1],
    reduceMotion || !isMobile ? ["0%", "0%"] : ["-8%", "8%"],
  );

  return (
    <div
      className="foundation-stack-card-shell"
      style={{ top: `${8 + index * 5}vh`, zIndex: index + 1 }}
    >
      <motion.div
        ref={cardRef}
        className="foundation-stack-card"
        initial={reduceMotion ? false : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ scale: visualScale }}
      >
        <motion.div className="foundation-stack-image-inner" style={{ y: imageY }}>
          <Image
            className="foundation-stack-image"
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 700px) 90vw, 45vw"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

function FoundationStack() {
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start start", "end start"],
  });

  // Below 700px the pile collapses to plain stacked photos (see
  // .foundation-stack-card-shell in the mobile media query) — no sticky
  // pinning, so the scale-recede effect has nothing to recede behind and
  // is turned off here rather than left to run disconnected from any pile.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div ref={listRef} className="foundation-stack-list">
      {STACK_IMAGES.map((image, index) => (
        <FoundationStackCard
          key={`${image.src}-${index}`}
          image={image}
          index={index}
          progress={scrollYProgress}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

export default function FoundationCharity() {
  const reduceMotion = useReducedMotion();

  // CinematicTextReveal's whileInView threshold (amount:0.35) is a fraction
  // of ITS OWN element's height — unreachable once that element is taller
  // than roughly 3 viewports, which the pile now is (6 stacked cards with
  // scroll-room between them). So it wraps only the short sticky copy block
  // here rather than the whole section; each stacked card already has its
  // own working whileInView entrance sized to the card itself.
  //
  // The CTA sits outside that reveal, in its own plain opacity fade — the
  // reveal's clip-path wipes in from the bottom, and since the button was
  // the last (bottom-most) thing in that block, the clip sliced straight
  // through its pill shape mid-animation instead of fading it in cleanly.
  return (
    <div className="foundation-charity" id="foundation">
      <div className="foundation-copy">
      <div className="foundation-copy-range">
        <div className="foundation-copy-sticky">
          <div className="foundation-copy-text">
            <TextStagger as="span" className="narrative-kicker" text="Foundation & Charity" />
            <TextStagger as="h2" className="foundation-heading" text="Running toward something bigger." startDelay={0.15} />
            <CinematicTextReveal className="foundation-body" delay={0.3}>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                aliquip ex ea commodo consequat.
              </p>
            </CinematicTextReveal>
          </div>
          <motion.a
            className="foundation-cta"
            href="#"
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <span className="foundation-cta-fill" aria-hidden="true" />
            <span className="foundation-cta-label">Learn about the foundation</span>
            <span className="foundation-cta-circle" aria-hidden="true">
              <span className="foundation-cta-arrow">&#8594;</span>
            </span>
          </motion.a>
        </div>
      </div>
      </div>

      <FoundationStack />
    </div>
  );
}
