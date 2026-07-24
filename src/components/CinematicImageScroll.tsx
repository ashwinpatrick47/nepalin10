"use client";

import Image, { type ImageProps } from "next/image";
import {
  motion,
  type Variants,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";

export type CinematicImageSlide = {
  src: ImageProps["src"];
  alt: string;
  title: string;
};

type CinematicImageScrollProps = {
  images: readonly CinematicImageSlide[];
  children: ReactNode;
};

const revealOrder = [0, 1, 2, 3];

const windowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (beat: number) => ({
    opacity: 1,
    transition: {
      duration: 1.35,
      delay: beat * 0.14,
      ease: [0.33, 1, 0.68, 1],
    },
  }),
};

const mobileWindowVariants: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 24, scale: 1.025 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    scale: 1,
    transition: {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function CinematicWindow({
  slide,
  index,
  isMobile,
}: {
  slide: CinematicImageSlide;
  index: number;
  isMobile: boolean;
}) {
  const windowRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const isWindowInView = useInView(windowRef, { once: true, amount: 0.42 });
  const beat = revealOrder[index] ?? index;
  const { scrollYProgress } = useScroll({
    target: windowRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-9%", "9%"],
  );

  return (
    <motion.figure
      ref={windowRef}
      className="story-card"
      custom={isMobile ? 0 : beat}
      variants={
        reduceMotion
          ? undefined
          : isMobile
            ? mobileWindowVariants
            : windowVariants
      }
      initial={isMobile && !reduceMotion ? "hidden" : undefined}
      animate={
        isMobile && !reduceMotion
          ? isWindowInView
            ? "visible"
            : "hidden"
          : undefined
      }
    >
      <motion.div className="story-card-media" style={{ y: imageY }}>
        <Image
          src={slide.src}
          alt={slide.alt}
          fill
          sizes="(max-width: 700px) 100vw, 44vw"
        />
      </motion.div>
      <figcaption>{slide.title}</figcaption>
    </motion.figure>
  );
}

export default function CinematicImageScroll({
  images,
  children,
}: CinematicImageScrollProps) {
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return (
    <div className="cinematic-story-sequence">
      <motion.div
        className="story-card-grid"
        initial={reduceMotion || isMobile ? false : "hidden"}
        whileInView={reduceMotion || isMobile ? undefined : "visible"}
        viewport={{ once: true, amount: 0.28 }}
      >
        {images.map((slide, index) => (
          <CinematicWindow
            key={`${slide.title}-${index}`}
            slide={slide}
            index={index}
            isMobile={isMobile}
          />
        ))}
      </motion.div>
      <motion.div
        className="story-grid-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(9px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function CinematicTextReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : {
        opacity: 0,
        y: 72,
        filter: "blur(12px)",
        clipPath: "inset(0 0 24% 0)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        clipPath: "inset(0 0 0% 0)",
      }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CinematicImageFrame({
  src,
  alt,
  caption,
}: {
  src: ImageProps["src"];
  alt: string;
  caption: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const width = useTransform(
    scrollYProgress,
    [0, 0.625, 1],
    reduceMotion ? ["100vw", "100vw", "100vw"] : ["60vw", "100vw", "100vw"],
  );
  const height = useTransform(
    scrollYProgress,
    [0, 0.625, 1],
    reduceMotion ? ["100svh", "100svh", "100svh"] : ["60svh", "100svh", "100svh"],
  );
  const borderRadius = useTransform(
    scrollYProgress,
    [0, 0.625, 1],
    reduceMotion ? [0, 0, 0] : [28, 0, 0],
  );
  const imageScale = useTransform(
    scrollYProgress,
    [0, 0.625, 1],
    reduceMotion ? [1, 1, 1] : [1.08, 1, 1],
  );

  return (
    <section ref={ref} className="story-image-expansion">
      <div className="story-image-sticky">
        <motion.figure
          className="story-image"
          style={{ width, height, borderRadius }}
        >
          <motion.div
            className="story-image-media"
            style={reduceMotion ? undefined : { scale: imageScale }}
          >
            <Image src={src} alt={alt} fill sizes="100vw" />
          </motion.div>
          <div className="story-image-logo" aria-hidden="true">
            <span className="story-image-logo-mark">
              <Image
                src="/images/logo/logo.png"
                alt=""
                fill
                sizes="clamp(88px, 9vw, 142px)"
              />
            </span>
            <span className="story-image-logo-separator">/</span>
            <span className="story-image-flag">
              <Image
                src="/images/logo/flag.svg"
                alt=""
                fill
                sizes="clamp(54px, 5.5vw, 88px)"
              />
            </span>
          </div>
          <figcaption>{caption}</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
