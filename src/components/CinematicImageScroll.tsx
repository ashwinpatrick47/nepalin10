"use client";

import Image, { type ImageProps } from "next/image";
import {
  motion,
  type Variants,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { type ReactNode, useRef } from "react";

export type CinematicImageSlide = {
  src: ImageProps["src"];
  alt: string;
  title: string;
};

type CinematicImageScrollProps = {
  images: readonly CinematicImageSlide[];
  children: ReactNode;
};

const revealOrder = [0, 2, 2, 1];

const windowVariants: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)", y: 14, scale: 1.035 },
  visible: (beat: number) => ({
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    scale: 1,
    transition: {
      duration: 0.95,
      delay: beat * 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function CinematicWindow({
  slide,
  index,
}: {
  slide: CinematicImageSlide;
  index: number;
}) {
  const windowRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
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
      custom={beat}
      variants={reduceMotion ? undefined : windowVariants}
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

  return (
    <div className="cinematic-story-sequence">
      <motion.div
        className="story-card-grid"
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.28 }}
      >
        {images.map((slide, index) => (
          <CinematicWindow
            key={`${slide.title}-${index}`}
            slide={slide}
            index={index}
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
}: {
  children: ReactNode;
  className: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 48, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
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
    offset: ["start 90%", "end 45%"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <motion.figure
      ref={ref}
      className="story-image"
      initial={reduceMotion ? false : { opacity: 0, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="story-image-media" style={reduceMotion ? undefined : { y: imageY }}>
        <Image src={src} alt={alt} fill sizes="(max-width: 700px) 100vw, 88vw" />
      </motion.div>
      <figcaption>{caption}</figcaption>
    </motion.figure>
  );
}
