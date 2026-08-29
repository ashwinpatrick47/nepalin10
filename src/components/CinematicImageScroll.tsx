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

const INTRO_ENGLISH_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const INTRO_NEPALI_GLYPHS = [
  "अ", "आ", "इ", "ई", "उ", "ए", "ओ", "क", "ख", "ग", "घ", "च",
  "ज", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य",
  "र", "ल", "व", "श", "स", "ह",
];

type IntroductionLanguage = "nepali" | "english";

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
  id,
}: {
  children: ReactNode;
  className: string;
  delay?: number;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      id={id}
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
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const introductionOverlayOpacity = useTransform(
    scrollYProgress,
    [0.04, 0.16, 1],
    reduceMotion ? [0.52, 0.52, 0.52] : [0, 0.52, 0.52],
  );
  const nepaliIntroductionY = useTransform(
    scrollYProgress,
    [0.12, 0.24, 0.4],
    reduceMotion ? ["0%", "0%", "0%"] : ["9%", "0%", "-8%"],
  );
  const nepaliIntroductionOpacity = useTransform(
    scrollYProgress,
    [0, 0.119, 0.12, 0.24, 0.34, 0.4, 1],
    reduceMotion
      ? [0, 0, 0, 0, 0, 0, 0]
      : [0, 0, 0, 1, 1, 0, 0],
  );
  const nepaliIntroductionBlur = useTransform(
    scrollYProgress,
    [0.12, 0.24, 0.4],
    reduceMotion
      ? ["blur(0px)", "blur(0px)", "blur(0px)"]
      : ["blur(12px)", "blur(0px)", "blur(9px)"],
  );
  const nepaliIntroductionScale = useTransform(
    scrollYProgress,
    [0.12, 0.24, 0.4],
    reduceMotion ? [1, 1, 1] : [0.975, 1, 1.02],
  );
  const englishIntroductionY = useTransform(
    scrollYProgress,
    [0, 0.34, 0.5, 1],
    reduceMotion
      ? ["0%", "0%", "0%", "0%"]
      : ["9%", "9%", "0%", "0%"],
  );
  const englishIntroductionOpacity = useTransform(
    scrollYProgress,
    [0, 0.34, 0.4, 0.5, 1],
    reduceMotion ? [1, 1, 1, 1, 1] : [0, 0, 0, 1, 1],
  );
  const englishIntroductionBlur = useTransform(
    scrollYProgress,
    [0, 0.34, 0.5, 1],
    reduceMotion
      ? ["blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)"]
      : ["blur(12px)", "blur(12px)", "blur(0px)", "blur(0px)"],
  );
  const englishIntroductionScale = useTransform(
    scrollYProgress,
    [0, 0.34, 0.5, 1],
    reduceMotion ? [1, 1, 1, 1] : [0.975, 0.975, 1, 1],
  );
  const nepaliIntroductionVisibility = useTransform(
    scrollYProgress,
    [0, 0.119, 0.12, 0.399, 0.4, 1],
    ["hidden", "hidden", "visible", "visible", "hidden", "hidden"],
  );
  const englishIntroductionVisibility = useTransform(
    scrollYProgress,
    [0, 0.399, 0.4, 1],
    ["hidden", "hidden", "visible", "visible"],
  );
  const exitCoverY = useTransform(
    scrollYProgress,
    [0, 0.76, 0.98, 1],
    reduceMotion
      ? ["105%", "105%", "105%", "105%"]
      : ["105%", "105%", "0%", "0%"],
  );
  const nepaliIntroductionResolve = 1;
  const englishIntroductionResolve = 1;

  return (
    <section ref={ref} className="story-image-expansion">
      <div className="story-image-sticky">
        <motion.figure className="story-image">
          <motion.div className="story-image-media">
            <Image src={src} alt={alt} fill sizes="100vw" />
          </motion.div>
          <motion.div className="story-image-introduction-layer">
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
                        scale: nepaliIntroductionScale,
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
                        opacity: englishIntroductionOpacity,
                        y: englishIntroductionY,
                        scale: englishIntroductionScale,
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
          </motion.div>
          <motion.div
            className="story-image-exit-cover"
            aria-hidden="true"
            style={{ y: exitCoverY }}
          />
        </motion.figure>
      </div>
    </section>
  );
}

