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

const storyWindows: readonly CinematicImageSlide[] = [
  { src: "/images/himalaya-clouds.jpg", alt: "Clouds drifting above Nepal", title: "" },
  { src: "/images/himalaya-mountains.jpg", alt: "Snow-covered Himalayan peaks", title: "" },
  { src: "/images/himalayan-valley.png", alt: "A trail through the Himalayan valley", title: "" },
  { src: "/images/monastery-hero.png", alt: "A monastery beneath the Himalayas", title: "" },
];

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
  const titleY = useTransform(
    scrollYProgress,
    [0, 0.16, 0.5, 0.72, 1],
    ["0vh", "-1vh", "-18vh", "-42vh", "-58vh"],
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

            <motion.div
              className="hero-copy"
              style={{ x: "-50%", y: titleY }}
            >
              <h1 aria-label="Attempting a world record">
                <span className="title-mask"><span>ATTEMPTING</span></span>
                <span className="title-mask title-serif"><em>A WORLD RECORD</em></span>
              </h1>
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
      </section>

      <section className="story-content" aria-labelledby="story-title">
        <CinematicTextReveal className="story-intro">
          <p className="story-kicker">ABOVE THE TREELINE / 5,364 M</p>
          <h2 id="story-title">Where the trail<br /><em>becomes ritual.</em></h2>
        </CinematicTextReveal>

        <CinematicImageScroll images={storyWindows}>
          <p>
            A slow passage through thin air, ancient villages and the quiet
            shoulders of the Himalayas. Every step leaves the familiar further behind.
          </p>
        </CinematicImageScroll>

        <div className="story-stats" aria-label="Journey details">
          <div><strong>12</strong><span>Days on foot</span></div>
          <div><strong>86</strong><span>Kilometres climbed</span></div>
          <div><strong>01</strong><span>Path through Nepal</span></div>
        </div>

        <CinematicImageFrame
          src="/images/himalaya-mountains.jpg"
          alt="A wide view across the Himalayan range"
          caption="THE KHUMBU VALLEY / NEPAL"
        />

        <div className="story-chapters">
          <article>
            <span>01 / ARRIVAL</span>
            <h3>Enter the valley</h3>
            <p>Follow the river beyond the last roads, where pine forests give way to stone paths.</p>
          </article>
          <article>
            <span>02 / ASCENT</span>
            <h3>Move with the mountain</h3>
            <p>Climb slowly through changing weather, prayer flags and settlements held above the clouds.</p>
          </article>
          <article>
            <span>03 / STILLNESS</span>
            <h3>Reach the high place</h3>
            <p>Arrive where the landscape opens and the noise of the world finally falls away.</p>
          </article>
        </div>

        <footer className="story-footer">
          <p>RARA&apos;S RUNS</p>
        </footer>
      </section>
    </main>
  );
}
