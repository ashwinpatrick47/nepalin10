"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import CinematicImageScroll, {
  CinematicImageFrame,
  CinematicStillImageFrame,
  CinematicTextReveal,
  type CinematicImageSlide,
} from "@/components/CinematicImageScroll";
import AnimatedStats from "@/components/AnimatedStats";

const storyWindows: readonly CinematicImageSlide[] = [
  {
    src: "/images/himalaya-clouds.jpg",
    alt: "Clouds drifting above Nepal",
    title: "",
  },
  {
    src: "/images/himalaya-mountains.jpg",
    alt: "Snow-covered Himalayan peaks",
    title: "",
  },
  {
    src: "/images/himalayan-valley.png",
    alt: "A trail through the Himalayan valley",
    title: "",
  },
  {
    src: "/images/monastery-hero.png",
    alt: "A monastery beneath the Himalayas",
    title: "",
  },
];

const journeyStats = [
  { number: "10", label: "Days on foot" },
  { number: "1026", label: "Kilometres distance" },
  { number: "01", label: "Path through highway" },
] as const;

const manifestoEnglish = [
  "Redefining",
  "limits,",
  "fighting",
  "for",
  "wins,",
  "bringing",
  "it",
  "all",
  "in",
  "all",
  "ways.",
  "Defining",
  "a",
  "legacy",
  "in",
  "running",
  "on",
  "and",
  "off",
  "the",
  "track.",
] as const;

const manifestoNepali = [
  "सीमाहरू",
  "पुनर्परिभाषित",
  "गर्दै,",
  "जितका",
  "लागि",
  "लड्दै,",
  "हरेक",
  "तरिकाले",
  "सबै",
  "कुरा",
  "समेट्दै।",
  "दौडमा",
  "र",
  "ट्र्याकबाहिर",
  "एउटा",
  "विरासत",
  "निर्माण",
  "गर्दै।",
] as const;

const ENGLISH_CIPHER_GLYPHS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

const NEPALI_CIPHER_GLYPHS = [
  "अ",
  "आ",
  "इ",
  "ई",
  "उ",
  "ऊ",
  "ए",
  "ऐ",
  "ओ",
  "औ",
  "क",
  "ख",
  "ग",
  "घ",
  "च",
  "छ",
  "ज",
  "झ",
  "त",
  "थ",
  "द",
  "ध",
  "न",
  "प",
  "फ",
  "ब",
  "भ",
  "म",
  "य",
  "र",
  "ल",
  "व",
  "श",
  "स",
  "ह",
  "का",
  "कि",
  "की",
  "कु",
  "के",
  "को",
  "गा",
  "गी",
  "ना",
  "नि",
  "नी",
  "ता",
  "ति",
  "ती",
  "दा",
  "दि",
  "धी",
  "मा",
  "मि",
  "मी",
  "भा",
  "भि",
  "हि",
  "था",
  "थि",
  "रा",
  "री",
  "ला",
  "ली",
] as const;

type CipherLanguage = "nepali" | "english";

type CipherWordProps = {
  word: string;
  language: CipherLanguage;
  resolve: number;
  accent: boolean;
  wordIndex: number;
};

function splitGraphemes(
  text: string,
  language: CipherLanguage,
): string[] {
  if (
    typeof Intl !== "undefined" &&
    "Segmenter" in Intl &&
    typeof Intl.Segmenter === "function"
  ) {
    const locale = language === "nepali" ? "ne" : "en";

    const segmenter = new Intl.Segmenter(locale, {
      granularity: "grapheme",
    });

    return Array.from(
      segmenter.segment(text),
      item => item.segment,
    );
  }

  return Array.from(text);
}

function seededNumber(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getCipherGlyph(
  language: CipherLanguage,
  wordIndex: number,
  glyphIndex: number,
  animationStep: number,
) {
  const pool =
    language === "nepali"
      ? NEPALI_CIPHER_GLYPHS
      : ENGLISH_CIPHER_GLYPHS;

  const seed =
    wordIndex * 173 +
    glyphIndex * 47 +
    animationStep * 31;

  const index = Math.floor(
    seededNumber(seed) * pool.length,
  );

  return pool[index];
}

function CipherWord({
  word,
  language,
  resolve,
  accent,
  wordIndex,
}: CipherWordProps) {
  const graphemes = splitGraphemes(word, language);
  const animationStep = Math.floor((1 - resolve) * 20);

  return (
    <span
      className={`story-manifesto-word${
        accent ? " is-accent" : ""
      }`}
    >
      {graphemes.map((grapheme, glyphIndex) => {
        const lockPoint =
          graphemes.length <= 1
            ? 0.5
            : (glyphIndex + 1) / graphemes.length;

        const isResolved = resolve >= lockPoint;

        const displayGlyph = isResolved
          ? grapheme
          : getCipherGlyph(
              language,
              wordIndex,
              glyphIndex,
              animationStep,
            );

        return (
          <span
            key={`${wordIndex}-${glyphIndex}`}
            className={`story-manifesto-glyph${
              isResolved
                ? " is-resolved"
                : " is-cipher"
            }`}
          >
            {displayGlyph}
          </span>
        );
      })}
    </span>
  );
}

function LanguageManifesto() {
  const manifestoRef = useRef<HTMLElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [progress, setProgress] = useState(0);

  const { scrollYProgress: manifestoProgress } =
    useScroll({
      target: manifestoRef,
      offset: ["start start", "end end"],
    });

  useMotionValueEvent(
    manifestoProgress,
    "change",
    latestProgress => {
      setProgress(latestProgress);
    },
  );

  const nepaliResolve = 1;
  const englishResolve = 1;

  const nepaliY = useTransform(
    manifestoProgress,
    [0, 0.06, 0.228, 0.312],
    ["7%", "0%", "0%", "-8%"],
  );

  const nepaliBlur = useTransform(
    manifestoProgress,
    [0, 0.06, 0.228, 0.312],
    ["blur(12px)", "blur(0px)", "blur(0px)", "blur(9px)"],
  );

  const nepaliOpacity = useTransform(
    manifestoProgress,
    [0, 0.06, 0.252, 0.312, 1],
    [0, 1, 1, 0, 0],
  );

  const nepaliScale = useTransform(
    manifestoProgress,
    [0, 0.06, 0.228, 0.312],
    [0.985, 1, 1, 1.02],
  );

  const nepaliVisibility = useTransform(
    manifestoProgress,
    [0, 0.3114, 0.312, 1],
    ["visible", "visible", "hidden", "hidden"],
  );

  const englishY = useTransform(
    manifestoProgress,
    [0, 0.288, 0.396, 1],
    ["8%", "8%", "0%", "0%"],
  );

  const englishBlur = useTransform(
    manifestoProgress,
    [0, 0.288, 0.396, 1],
    [
      "blur(7px)",
      "blur(7px)",
      "blur(0px)",
      "blur(0px)",
    ],
  );

  const englishOpacity = useTransform(
    manifestoProgress,
    [0, 0.288, 0.336, 0.396, 1],
    [0, 0, 0, 1, 1],
  );

  const englishScale = useTransform(
    manifestoProgress,
    [0, 0.288, 0.396, 1],
    [0.985, 0.985, 1, 1],
  );

  const englishVisibility = useTransform(
    manifestoProgress,
    [0, 0.2874, 0.288, 1],
    ["hidden", "hidden", "visible", "visible"],
  );

  return (
    <section
      ref={manifestoRef}
      className={`story-manifesto${
        reduceMotion ? " is-reduced" : ""
      }`}
      aria-label="Redefining limits, fighting for wins, bringing it all in all ways. Defining a legacy in running on and off the track."
    >
      <div className="story-manifesto-stage">
        <div
          className="story-manifesto-logo"
          aria-hidden="true"
        >
          <span className="story-manifesto-logo-mark" />
        </div>

        <div className="story-manifesto-copy">
          <motion.p
            className="story-manifesto-nepali"
            lang="ne"
            aria-hidden="true"
            style={
              reduceMotion
                ? {
                    display:
                      progress < 0.5 ? "block" : "none",
                  }
                : {
                    opacity: nepaliOpacity,
                    y: nepaliY,
                    scale: nepaliScale,
                    filter: nepaliBlur,
                    visibility: nepaliVisibility,
                  }
            }
          >
            {manifestoNepali.map((word, index) => (
              <CipherWord
                key={`${word}-${index}`}
                word={word}
                language="nepali"
                resolve={nepaliResolve}
                wordIndex={index}
                accent={
                  index === 1 ||
                  index === 3 ||
                  index === 15
                }
              />
            ))}
          </motion.p>

          <motion.p
            className="story-manifesto-english"
            lang="en"
            aria-hidden="true"
            style={
              reduceMotion
                ? {
                    display:
                      progress >= 0.5 ? "block" : "none",
                  }
                : {
                    opacity: englishOpacity,
                    y: englishY,
                    scale: englishScale,
                    filter: englishBlur,
                    visibility: englishVisibility,
                  }
            }
          >
            {manifestoEnglish.map((word, index) => (
              <span key={`${word}-${index}`}>
                <CipherWord
                  word={word}
                  language="english"
                  resolve={englishResolve}
                  wordIndex={index}
                  accent={
                    index === 0 ||
                    index === 4 ||
                    index === 13
                  }
                />

                {(index === 1 || index === 4) && <br />}

                {index === 8 && (
                  <br className="manifesto-break-mobile" />
                )}

                {index === 9 && (
                  <br className="manifesto-break-desktop" />
                )}

                {index === 15 && (
                  <br className="manifesto-break-mobile" />
                )}

                {index === 16 && (
                  <br className="manifesto-break-desktop" />
                )}
              </span>
            ))}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export default function HimalayanParallax() {
  const sceneRef = useRef<HTMLElement>(null);
  const introRevealTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;
    const heroImages = Array.from(
      sceneRef.current?.querySelectorAll("img") ?? [],
    );

    const waitForImage = (image: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
          resolve();
        };

        if (image.complete) {
          image.decode?.().catch(() => undefined).finally(finish);
          return;
        }

        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });

    Promise.all(heroImages.map(waitForImage)).then(() => {
      if (!cancelled) root.classList.add("hima-assets-ready");
    });

    return () => {
      cancelled = true;
      if (introRevealTimer.current !== null) {
        window.clearTimeout(introRevealTimer.current);
      }
      root.classList.remove("hima-assets-ready", "hima-reveal");
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  const skyY = useTransform(
    scrollYProgress,
    [0, 1],
    ["14vh", "34vh"],
  );

  const mountainY = useTransform(
    scrollYProgress,
    [0, 0.18, 1],
    ["6vh", "0vh", "-45vh"],
  );

  const monasteryY = useTransform(
    scrollYProgress,
    [0, 1],
    ["-1vh", "-104vh"],
  );

  return (
    <main>
      <section
        id="top"
        ref={sceneRef}
        className="parallax-header"
      >
        <header className="site-header">
          <div className="site-header-center">
            <span>27.7172° N / 85.3240° E</span>
            <span>PROJECT / नेपाल</span>
          </div>
        </header>

        <div
          className="hero-project-mark"
          aria-label="An ebb and flow project"
        >
          <span>AN</span>

          <span
            className="hero-project-wordmark"
            aria-hidden="true"
          >
            <Image
              src="/images/logo/title.PNG"
              alt=""
              fill
              priority
              sizes="72px"
            />
          </span>

          <span>PROJECT</span>
        </div>

        <div className="hero-copy">
          <h1 aria-label="Attempting a world record">
            <span className="title-mask">
              <span>ATTEMPTING</span>
            </span>

            <span className="title-mask title-serif">
              <em>A WORLD RECORD</em>
            </span>
          </h1>
        </div>

        <div className="parallax-visuals">
          <div className="parallax-layers">
            <motion.div
              className="image-layer sky-layer"
              style={{ y: skyY }}
            >
              <Image
                src="/images/himalaya-clouds.jpg"
                alt="Open blue sky over Nepal"
                fill
                priority
                sizes="100vw"
              />
            </motion.div>

            <motion.div
              className="image-layer mountain-layer"
              style={{ y: mountainY }}
            >
              <div className="mountain-entry">
                <Image
                  src="/images/mountains-foreground.png"
                  alt="The snow-covered Himalayas in Nepal"
                  fill
                  priority
                  sizes="100vw"
                />
              </div>
            </motion.div>

            <motion.div
              className="image-layer monastery-layer"
              style={{ y: monasteryY }}
            >
              <div className="monastery-entry">
                <Image
                  src="/images/monastery-foreground-ai-approved.png"
                  alt="A Himalayan monastery with prayer flags"
                  fill
                  priority
                  unoptimized
                  sizes="118vw"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div
          className="fog-layer"
          aria-hidden="true"
          onAnimationStart={() => {
            introRevealTimer.current = window.setTimeout(() => {
              document.documentElement.classList.add("hima-reveal");
            }, 2850);
          }}
          onAnimationEnd={() => {
            if (introRevealTimer.current !== null) {
              window.clearTimeout(introRevealTimer.current);
              introRevealTimer.current = null;
            }
            window.dispatchEvent(
              new Event("hima:intro-complete"),
            );
          }}
        >
          <div className="fog-light" />
        </div>

        <div
          className="fog-loader-content"
          role="status"
          aria-label="Loading"
        >
          <div
            className="fog-loader-ripples"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>

          <div className="fog-logo" aria-hidden="true">
            <Image
              src="/images/logo/logo.png"
              alt=""
              fill
              priority
              sizes="128px"
            />
          </div>

          <div
            className="fog-loading-message"
            aria-hidden="true"
          >
            {"Loading".split("").map(
              (character, index) => (
                <span
                  key={`${character}-${index}`}
                  style={{
                    animationDelay: `${index * 16}ms`,
                  }}
                >
                  {character}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        className="story-content"
        aria-labelledby="story-title"
      >
        <CinematicTextReveal className="story-intro">
          <p className="story-kicker">
            The Endless Stretch / Nepal in 10
          </p>

          <h2 id="story-title">
            Where the trail
            <br />
            <em>becomes ritual.</em>
          </h2>
        </CinematicTextReveal>

        <CinematicImageScroll images={storyWindows}>
          <p>
            A slow passage through thin air, ancient villages
            and the quiet shoulders of the Himalayas. Every
            step leaves the familiar further behind.
          </p>
        </CinematicImageScroll>

        <AnimatedStats stats={journeyStats} />

        <LanguageManifesto />

        <CinematicImageFrame
          src="/images/himalaya-mountains.jpg"
          alt="A wide view across the Himalayan range"
        />

        <CinematicStillImageFrame
          src="/images/himalaya-mountains.jpg"
          alt="A wide view across the Himalayan range"
          caption="THE KHUMBU VALLEY / NEPAL"
        />

        <div className="story-chapters">
          <CinematicTextReveal className="story-chapter-reveal">
            <article>
              <span>01 / DEPARTURE</span>
              <h3>The first stride</h3>
              <p>
                Step onto the Mahendra Highway and begin a
                journey that stretches across Nepal, one
                kilometre at a time.
              </p>
            </article>
          </CinematicTextReveal>

          <CinematicTextReveal
            className="story-chapter-reveal"
            delay={0.12}
          >
            <article>
              <span>02 / ENDURANCE</span>
              <h3>Find your rhythm</h3>
              <p>
                Through changing weather, busy towns and
                endless roads, every step becomes a test of
                consistency and resolve.
              </p>
            </article>
          </CinematicTextReveal>

          <CinematicTextReveal
            className="story-chapter-reveal"
            delay={0.24}
          >
            <article>
              <span>03 / LEGACY</span>
              <h3>Keep moving forward</h3>
              <p>
                Beyond the finish lies something greater than
                distance—a story written through perseverance,
                resilience and every mile earned.
              </p>
            </article>
          </CinematicTextReveal>
        </div>

        <CinematicTextReveal className="story-footer-reveal">
          <footer className="story-footer">
            <p>RARA&apos;S RUNS</p>
          </footer>
        </CinematicTextReveal>
      </section>
    </main>
  );
}
