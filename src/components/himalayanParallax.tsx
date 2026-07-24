"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import CinematicImageScroll, {
  CinematicImageFrame,
  CinematicTextReveal,
  type CinematicImageSlide,
} from "@/components/CinematicImageScroll";
import AnimatedStats from "@/components/AnimatedStats";

const storyWindows: readonly CinematicImageSlide[] = [
  { src: "/images/himalaya-clouds.jpg", alt: "Clouds drifting above Nepal", title: "" },
  { src: "/images/himalaya-mountains.jpg", alt: "Snow-covered Himalayan peaks", title: "" },
  { src: "/images/himalayan-valley.png", alt: "A trail through the Himalayan valley", title: "" },
  { src: "/images/monastery-hero.png", alt: "A monastery beneath the Himalayas", title: "" },
];

const journeyStats = [
  { number: "10", label: "Days on foot" },
  { number: "1026", label: "Kilometres distance" },
  { number: "01", label: "Path through highway" },
] as const;

export default function HimalayanParallax() {
  const sceneRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  const skyY = useTransform(scrollYProgress, [0, 1], ["14vh", "34vh"]);
  const mountainY = useTransform(
    scrollYProgress,
    [0, 0.18, 1],
    ["6vh", "0vh", "-45vh"],
  );
  const monasteryY = useTransform(scrollYProgress, [0, 1], ["-1vh", "-104vh"]);

  return (
    <main>
      <section id="top" ref={sceneRef} className="parallax-header">
        <header className="site-header">
          <div className="site-header-center">
            <span>27.7172° N / 85.3240° E</span>
            <span>PROJECT / NEPAL</span>
          </div>
        </header>

        <div className="hero-project-mark" aria-label="An ebb and flow project">
          <span>AN</span>
          <span className="hero-project-wordmark" aria-hidden="true">
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
            <span className="title-mask"><span>ATTEMPTING</span></span>
            <span className="title-mask title-serif"><em>A WORLD RECORD</em></span>
          </h1>
        </div>

        <div className="parallax-visuals">
          <div className="parallax-layers">
            <motion.div className="image-layer sky-layer" style={{ y: skyY }}>
              <Image src="/images/himalaya-clouds.jpg" alt="Open blue sky over Nepal" fill priority sizes="100vw" />
            </motion.div>

            <motion.div className="image-layer mountain-layer" style={{ y: mountainY }}>
              <div className="mountain-entry">
                <Image src="/images/mountains-foreground.png" alt="The snow-covered Himalayas in Nepal" fill priority sizes="100vw" />
              </div>
            </motion.div>

            <motion.div className="image-layer monastery-layer" style={{ y: monasteryY }}>
              <div className="monastery-entry">
                <Image src="/images/monastery-foreground-ai-approved.png" alt="A Himalayan monastery with prayer flags" fill priority unoptimized sizes="118vw" />
              </div>
            </motion.div>
          </div>

        </div>

        <div
          className="fog-layer"
          aria-hidden="true"
          onAnimationEnd={() => window.dispatchEvent(new Event("hima:intro-complete"))}
        >
          <div className="fog-light" />
        </div>
        <div className="fog-loader-content" role="status" aria-label="Loading">
          <div className="fog-loader-ripples" aria-hidden="true">
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
          <div className="fog-loading-message" aria-hidden="true">
            {"Loading".split("").map((character, index) => (
              <span
                key={`${character}-${index}`}
                style={{ animationDelay: `${index * 16}ms` }}
              >
                {character}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="story-content" aria-labelledby="story-title">
        <CinematicTextReveal className="story-intro">
          <p className="story-kicker">The Endless Stretch / Ebb&flo</p>
          <h2 id="story-title">Where the trail<br /><em>becomes ritual.</em></h2>
        </CinematicTextReveal>

        <CinematicImageScroll images={storyWindows}>
          <p>
            A slow passage through thin air, ancient villages and the quiet
            shoulders of the Himalayas. Every step leaves the familiar further behind.
          </p>
        </CinematicImageScroll>

        <AnimatedStats stats={journeyStats} />

        <CinematicImageFrame
          src="/images/himalaya-mountains.jpg"
          alt="A wide view across the Himalayan range"
          caption="THE KHUMBU VALLEY / NEPAL"
        />

        <div className="story-chapters">
          <CinematicTextReveal className="story-chapter-reveal">
            <article>
              <span>01 / DEPARTURE</span>
              <h3>The first stride</h3>
              <p>Step onto the Mahendra Highway and begin a journey that stretches across Nepal, one kilometre at a time.</p>
            </article>
          </CinematicTextReveal>

          <CinematicTextReveal className="story-chapter-reveal" delay={0.12}>
            <article>
              <span>02 / ENDURANCE</span>
              <h3>Find your rhythm</h3>
              <p>Through changing weather, busy towns and endless roads, every step becomes a test of consistency and resolve.</p>
            </article>
          </CinematicTextReveal>

          <CinematicTextReveal className="story-chapter-reveal" delay={0.24}>
            <article>
              <span>03 / LEGACY</span>
              <h3>Keep moving forward</h3>
              <p>Beyond the finish lies something greater than distance a story written through perseverance, resilience and every mile earned.</p>
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
