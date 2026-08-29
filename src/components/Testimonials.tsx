"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import TextStagger from "@/components/TextStagger";

// Layout modelled on quotetestimonial.framer.website: kicker, heading, big
// serif pull-quote + attribution on one side, a portrait-style image with
// a prev/next + counter control underneath on the other. Real quotes
// haven't been gathered yet, so — same as Foundation & Charity — this is
// lorem ipsum with placeholder attributions until they exist. The
// accompanying photos are the route itself rather than headshots, since
// there's no actual photo of whoever eventually gives each quote.
const TESTIMONIALS: readonly {
  quote: string;
  name: string;
  role: string;
  image: ImageProps["src"];
}[] = [
  {
    quote:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    name: "J. Rai",
    role: "Race Physiotherapist",
    image: "/images/himalaya-clouds.jpg",
  },
  {
    quote:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    name: "P. Gurung",
    role: "Training Partner",
    image: "/images/flag-nepal.jpg",
  },
  {
    quote:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    name: "S. Tamang",
    role: "Route Support Crew",
    image: "/images/himalaya-mountains.jpg",
  },
];

const AUTOPLAY_MS = 5000;

export default function Testimonials() {
  const reduceMotion = useReducedMotion();
  const [[index, direction], setIndex] = useState<[number, number]>([0, 1]);
  const total = TESTIMONIALS.length;
  const active = TESTIMONIALS[index];

  const imageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imageRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-8%", "8%"],
  );

  // Base layer holds whatever photo last finished revealing; the wipe
  // layer re-plays a clip-path reveal of the new photo over it each time
  // the slide changes, then hands off to the base layer once done — see
  // .testimonials-image-base/-wipe in globals.css for why this (rather
  // than a plain crossfade) produces the "shutter" look. Direction flips
  // which edge the reveal sweeps from, so "previous" visibly runs the
  // opposite way from "next" instead of always sweeping the same way.
  const [baseImage, setBaseImage] = useState<ImageProps["src"]>(active.image);

  // A click mid-wipe used to jump straight to whatever slide it landed on,
  // skipping the ones in between, which read as a glitch rather than
  // "next"/"previous". Rather than dropping clicks that land mid-transition
  // (buttons staying inert while you're actively clicking feels broken
  // too), the most recent one is remembered and played the moment the
  // current wipe finishes — every click still lands, just one at a time,
  // in order.
  const [isAnimating, setIsAnimating] = useState(false);
  const pendingStep = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      setBaseImage(active.image);
      setIsAnimating(false);
      pendingStep.current = null;
    }
  }, [reduceMotion, active.image]);

  const go = (step: number) => {
    if (isAnimating) {
      pendingStep.current = step;
      return;
    }
    setIsAnimating(true);
    setIndex(([current]) => [(current + step + total) % total, step]);
  };

  useEffect(() => {
    const id = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
    // isAnimating has to be a dependency, not just index/total — go()
    // closes over it, and without this the interval would keep the "still
    // animating" closure from whichever render created it forever, since
    // isAnimating flipping back to false on its own doesn't touch index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, isAnimating]);

  const handleWipeComplete = () => {
    setBaseImage(active.image);
    const next = pendingStep.current;
    pendingStep.current = null;
    if (next !== null) {
      setIndex(([current]) => [(current + next + total) % total, next]);
    } else {
      setIsAnimating(false);
    }
  };

  const slide = {
    initial: (dir: number) =>
      reduceMotion
        ? { opacity: 1 }
        : { opacity: 0, x: dir * 24, filter: "blur(6px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { opacity: 0, x: dir * -18, filter: "blur(5px)" },
  };

  const wipe = {
    initial: (dir: number) => ({
      clipPath: dir < 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)",
    }),
    animate: { clipPath: "inset(0 0 0 0)" },
  };

  return (
    <section className="testimonials-section" aria-label="Testimonials">
      <TextStagger as="span" className="testimonials-kicker" text="What people are saying" />
      <TextStagger as="h2" className="testimonials-heading" text="Testimonials" startDelay={0.15} />

      <div className="testimonials-layout">
        <div className="testimonials-copy">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={slide}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <blockquote className="testimonials-quote">
                &ldquo;{active.quote}&rdquo;
              </blockquote>
              <div className="testimonials-attribution">
                <span className="testimonials-name">{active.name}</span>
                <span className="testimonials-role">{active.role}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="testimonials-media">
          <div ref={imageRef} className="testimonials-image">
            <div className="testimonials-image-base">
              <motion.div className="testimonials-image-inner" style={{ y: imageY }}>
                <Image src={baseImage} alt="" fill sizes="(max-width: 700px) 80vw, 420px" />
              </motion.div>
            </div>
            <motion.div
              key={index}
              className="testimonials-image-wipe"
              custom={direction}
              variants={wipe}
              initial={reduceMotion ? false : "initial"}
              animate="animate"
              transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
              onAnimationComplete={handleWipeComplete}
            >
              <motion.div className="testimonials-image-inner" style={{ y: imageY }}>
                <Image
                  src={active.image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 80vw, 420px"
                />
              </motion.div>
            </motion.div>
          </div>

          <div className="testimonials-controls">
            <span className="testimonials-count">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <div className="testimonials-progress">
              <motion.div
                key={index}
                className="testimonials-progress-fill"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: reduceMotion ? 0 : AUTOPLAY_MS / 1000,
                  ease: "linear",
                }}
              />
            </div>
            <div className="testimonials-arrows">
              <button type="button" aria-label="Previous testimonial" onClick={() => go(-1)}>
                ←
              </button>
              <button type="button" aria-label="Next testimonial" onClick={() => go(1)}>
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
