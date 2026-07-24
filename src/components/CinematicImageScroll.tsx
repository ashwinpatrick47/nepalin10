"use client";

import Image, { type ImageProps } from "next/image";
import {
  motion,
  type Variants,
  useInView,
  useMotionValueEvent,
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

const INTRO_ENGLISH_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const INTRO_NEPALI_GLYPHS = [
  "अ", "आ", "इ", "ई", "उ", "ए", "ओ", "क", "ख", "ग", "घ", "च",
  "ज", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य",
  "र", "ल", "व", "श", "स", "ह",
];

type IntroductionLanguage = "nepali" | "english";

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function introductionGraphemes(
  text: string,
  language: IntroductionLanguage,
) {
  if (
    typeof Intl !== "undefined" &&
    "Segmenter" in Intl &&
    typeof Intl.Segmenter === "function"
  ) {
    const segmenter = new Intl.Segmenter(
      language === "nepali" ? "ne" : "en",
      { granularity: "grapheme" },
    );

    return Array.from(segmenter.segment(text), item => item.segment);
  }

  return Array.from(text);
}

function introductionCipherGlyph(
  language: IntroductionLanguage,
  wordIndex: number,
  glyphIndex: number,
  step: number,
) {
  const pool =
    language === "nepali"
      ? INTRO_NEPALI_GLYPHS
      : INTRO_ENGLISH_GLYPHS;
  const seed = Math.sin(
    (wordIndex * 173 + glyphIndex * 47 + step * 31) * 12.9898,
  ) * 43758.5453;
  const normalized = seed - Math.floor(seed);

  return pool[Math.floor(normalized * pool.length)];
}

function IntroductionCipherLine({
  text,
  language,
  resolve,
  className,
}: {
  text: string;
  language: IntroductionLanguage;
  resolve: number;
  className?: string;
}) {
  const words = text.split(" ");
  const step = Math.floor((1 - resolve) * 20);

  return (
    <span
      className={`story-image-introduction-line${
        className ? ` ${className}` : ""
      }`}
    >
      {words.map((word, wordIndex) => {
        const graphemes = introductionGraphemes(word, language);

        return (
          <span
            className="story-image-introduction-word"
            key={`${word}-${wordIndex}`}
          >
            {graphemes.map((grapheme, glyphIndex) => {
              const lockPoint =
                graphemes.length <= 1
                  ? 0.5
                  : (glyphIndex + 1) / graphemes.length;

              return (
                <span
                  className="story-image-introduction-glyph"
                  key={`${wordIndex}-${glyphIndex}`}
                >
                  {resolve >= lockPoint
                    ? grapheme
                    : introductionCipherGlyph(
                        language,
                        wordIndex,
                        glyphIndex,
                        step,
                      )}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

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
}: {
  src: ImageProps["src"];
  alt: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [introductionProgress, setIntroductionProgress] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", setIntroductionProgress);
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
  const introductionOverlayOpacity = useTransform(
    scrollYProgress,
    [0.58, 0.64, 1],
    reduceMotion ? [0.5, 0.5, 0.5] : [0, 0.5, 0.5],
  );
  const nepaliIntroductionY = useTransform(
    scrollYProgress,
    [0.64, 0.7, 0.8],
    reduceMotion ? ["0%", "0%", "0%"] : ["0%", "0%", "-12%"],
  );
  const nepaliIntroductionOpacity = useTransform(
    scrollYProgress,
    [0, 0.639, 0.64, 0.7, 1],
    reduceMotion ? [0, 0, 0, 0, 0] : [0, 0, 0, 1, 1],
  );
  const nepaliIntroductionBlur = useTransform(
    scrollYProgress,
    [0.64, 0.7, 0.8],
    reduceMotion
      ? ["blur(0px)", "blur(0px)", "blur(0px)"]
      : ["blur(0px)", "blur(0px)", "blur(7px)"],
  );
  const englishIntroductionY = useTransform(
    scrollYProgress,
    [0, 0.8, 0.94, 1],
    reduceMotion
      ? ["0%", "0%", "0%", "0%"]
      : ["12%", "12%", "0%", "0%"],
  );
  const englishIntroductionBlur = useTransform(
    scrollYProgress,
    [0, 0.8, 0.94, 1],
    reduceMotion
      ? ["blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)"]
      : ["blur(7px)", "blur(7px)", "blur(0px)", "blur(0px)"],
  );
  const nepaliIntroductionVisibility = useTransform(
    scrollYProgress,
    [0, 0.639, 0.64, 0.799, 0.8, 1],
    ["hidden", "hidden", "visible", "visible", "hidden", "hidden"],
  );
  const englishIntroductionVisibility = useTransform(
    scrollYProgress,
    [0, 0.799, 0.8, 1],
    ["hidden", "hidden", "visible", "visible"],
  );
  const nepaliIntroductionResolve = reduceMotion
    ? 0
    : 1 - clampProgress((introductionProgress - 0.7) / 0.1);
  const englishIntroductionResolve = reduceMotion
    ? 1
    : clampProgress((introductionProgress - 0.8) / 0.14);

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
          <motion.div
            className="story-image-introduction-overlay"
            aria-hidden="true"
            style={{ opacity: introductionOverlayOpacity }}
          />
          <div className="story-image-introduction">
            <motion.p
              className="story-image-introduction-nepali"
              lang="ne"
              aria-hidden="true"
              style={
                reduceMotion
                  ? { display: "none" }
                  : {
                      opacity: nepaliIntroductionOpacity,
                      y: nepaliIntroductionY,
                      filter: nepaliIntroductionBlur,
                      visibility: nepaliIntroductionVisibility,
                    }
              }
            >
              <IntroductionCipherLine
                text="मेरो नाम राहुल शर्मा हो"
                language="nepali"
                resolve={nepaliIntroductionResolve}
              />
              <IntroductionCipherLine
                className="story-image-introduction-subline"
                text="र म एक अल्ट्रा म्याराथन धावक हुँ।"
                language="nepali"
                resolve={nepaliIntroductionResolve}
              />
            </motion.p>
            <motion.p
              className="story-image-introduction-english"
              style={
                reduceMotion
                  ? undefined
                  : {
                      y: englishIntroductionY,
                      filter: englishIntroductionBlur,
                      visibility: englishIntroductionVisibility,
                    }
              }
            >
              <IntroductionCipherLine
                text="My name is Rahul Sharma"
                language="english"
                resolve={englishIntroductionResolve}
              />
              <IntroductionCipherLine
                className="story-image-introduction-subline"
                text="and I'm an ultra marathon runner."
                language="english"
                resolve={englishIntroductionResolve}
              />
            </motion.p>
          </div>
        </motion.figure>
      </div>
    </section>
  );
}

export function CinematicStillImageFrame({
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
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-7%", "7%"],
  );
  const logoY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [24, -24],
  );

  return (
    <motion.figure
      ref={ref}
      className="story-image-static"
      initial={reduceMotion ? false : { opacity: 0, y: 36, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="story-image-media" style={{ y: imageY }}>
        <Image src={src} alt={alt} fill sizes="(max-width: 700px) 100vw, 88vw" />
      </motion.div>
      <motion.div className="story-image-logo-motion" aria-hidden="true" style={{ y: logoY }}>
        <div className="story-image-logo">
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
      </motion.div>
      <figcaption>{caption}</figcaption>
    </motion.figure>
  );
}
