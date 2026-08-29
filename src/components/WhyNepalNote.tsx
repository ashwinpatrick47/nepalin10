"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import MapLabels from "./terrain/MapLabels";
import TextStagger from "@/components/TextStagger";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";

export default function WhyNepalNote() {
  const mediaRef = useRef<HTMLDivElement>(null);
  const bioPhotoRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-8%", "8%"],
  );
  // Same scroll-linked parallax as the flag above and the RunnerChapter
  // window — this photo shouldn't be the only static image on the page.
  const { scrollYProgress: bioPhotoProgress } = useScroll({
    target: bioPhotoRef,
    offset: ["start end", "end start"],
  });
  const bioPhotoY = useTransform(
    bioPhotoProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-9%", "9%"],
  );
  // offset is ["start end", "end start"] (target enters from below the
  // fold, exits above it) rather than ["start start", "end end"] — this
  // section's real height lands very close to one viewport, which made the
  // start-start/end-end range collapse to almost nothing, so
  // scrollYProgress never meaningfully advanced and every transform below
  // sat frozen at its start value the whole time, indistinguishable from
  // "not scroll-linked at all." This offset stays well-behaved regardless
  // of the section's height relative to the viewport.
  //
  // The copy has no scroll-linked transform of its own — elsewhere on this
  // site (FoundationCharity etc.) only images get continuous scroll-linked
  // movement; text only ever gets a one-time settle-in, handled here by the
  // outer CinematicTextReveal wrapper.
  return (
    <>
      {/* Plain div, not CinematicTextReveal — this is the outer container
          that gets physically slid up over the still-pinned RunnerChapter
          visuals (margin-top:-100svh in globals.css). CinematicTextReveal
          starts an element at opacity:0 and only fades it in once 35% of
          it is scrolled into view — fine for a section that's arriving in
          its own final position, but this one is already being dragged
          into place by the scroll-driven slide the whole time, so it sat
          invisible while sliding and then snapped to opaque all at once
          the moment the 35% threshold tripped: a "jumpscare" pop instead
          of the intended smooth slide-over. Same reason .story-content
          (the equivalent outer container for the hero→story slide) isn't
          wrapped in CinematicTextReveal either — only inner pieces like
          .story-intro get their own separate, smaller-scope reveal. */}
      <div className="why-nepal-bio">
        {/* Mobile-only kicker row (hidden on desktop, where the headline
            already carries the section on its own) — a small numbered
            label pair above the big statement, same rhythm as the Fuel
            reference's "(01) / (About Us)" row above its own headline. */}
        <div className="why-nepal-bio-kicker" aria-hidden="true">
          
        </div>

        <TextStagger
          as="h3"
          className="why-nepal-bio-headline"
          text="My name is Rahul Sharma — an ultra-marathon runner preparing to cross Nepal coast to coast, roughly 1,000 kilometres along the Mahendra Highway, on foot, in ten days."
        />

        <div className="why-nepal-bio-foot">
          <div ref={bioPhotoRef} className="why-nepal-bio-photo">
            <motion.div
              className="why-nepal-bio-photo-inner"
              style={{ y: bioPhotoY }}
            >
              <Image
                src="/images/himalayan-valley.png"
                alt="Rahul Sharma, ultra-marathon runner"
                fill
                sizes="(max-width: 700px) 140px, 260px"
              />
            </motion.div>
          </div>

          <div className="why-nepal-bio-rows">
            <div className="why-nepal-bio-row">
              <TextStagger as="span" className="why-nepal-bio-label" text="Why" />
              <TextStagger as="p" text="I’ve always been competitive and ambitious from childhood, I have now set my sights on the pursuit of becoming the greatest ultra runner ever. This means not just defying human limits, but defying all odds." />
            </div>

            <div className="why-nepal-bio-row">
              <TextStagger as="span" className="why-nepal-bio-label" text="How" />
              <TextStagger as="p" text="Having set a recent world record running the length of Sri Lanka 566km in 6 days, we aim to go from extreme heat to the extreme cold. 1027km in 10 days, averaging 103 km per day on foot." />
            </div>

            <div className="why-nepal-bio-row">
              <TextStagger as="span" className="why-nepal-bio-label" text="Numbers" />
              <TextStagger
                as="div"
                className="why-nepal-bio-stats"
                lines={[
                  <div key="distance" className="why-nepal-bio-stat"><span>Distance</span><span>~1,027 km</span></div>,
                  <div key="duration" className="why-nepal-bio-stat"><span>Duration</span><span>10 Days</span></div>,
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plain div, not CinematicTextReveal — static on load, no fade-in. */}
      {/* <div className="why-nepal-brand-strip">
        <div className="why-nepal-brand-strip-black" aria-hidden="true" />
      </div> */}
      {/* <div className="runner-chapter-ticker-strip">
        <MapLabels />
      </div> */}

      {/* Full-bleed flag photo with the copy laid over it in white — image
          and text both sit in their final, static position (only the
          flag's own continuous y parallax still runs); the entrance is a
          single opaque shutter/flap covering the whole stage, which slides
          fully off to the left (once, on first scroll into view) to reveal
          the flag and the copy together, rather than the image and text
          separately fading/sliding in on their own. */}
      <div className="why-nepal">
      <section ref={mediaRef} className="why-nepal-stage">
      <div className="why-nepal-media">
        <motion.div className="why-nepal-media-inner" style={{ y: imageY }}>
          <Image
            src="/images/flag-nepal.jpg"
            alt="The flag of Nepal"
            fill
            sizes="100vw"
          />
        </motion.div>
      </div>

      <div className="why-nepal-scrim" aria-hidden="true" />

      <div className="why-nepal-copy">
        <TextStagger
          as="span"
          className="why-nepal-kicker"
          style={{ color: "#ff0052" }}
          text="Why Nepal"
        />
        <TextStagger
          as="h2"
          className="why-nepal-heading"
          startDelay={0.15}
          lines={[
            "Because the road",
            "doesn't get easier.",
            <em key="em">It gets clearer.</em>,
          ]}
        />
        <CinematicTextReveal className="why-nepal-body" delay={0.3}>
          <p style={{ color: "white" }}>
            Although the Sri Lanka project was successful we completed the mission, created a documentary for the world to see, raised 27,000 for children’s cancers but it was a failure on a personal level. I failed to run 100km a day which is a challenge I had set for myself, so here we aim to tick that box.
          </p>
        </CinematicTextReveal>
      </div>

      <motion.div
        className="why-nepal-shutter"
        aria-hidden="true"
        initial={reduceMotion ? false : { x: "0%" }}
        whileInView={{ x: "-100%" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}
      />
      </section>
      </div>
    </>
  );
}
