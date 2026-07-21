"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Lenis from "lenis";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export default function HimalayanParallax() {
  const sceneRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
    let frame = 0;
    const animate = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, [reducedMotion]);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  // The section itself scrolls upward. These local offsets create the depth
  // hierarchy while keeping both foreground layers below frame on load.
  const skyY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const mountainY = useTransform(scrollYProgress, [0, 0.08, 0.55, 1], ["85vh", "85vh", "0vh", "-5vh"]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const monasteryY = useTransform(scrollYProgress, [0, 0.18, 0.88, 1], ["118vh", "118vh", "-8vh", "-10vh"]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <main>
      <header className="site-header">
        <a href="#top">HIMA <i /> NEPAL</a>
        <span>28.5983° N / 83.9311° E</span>
        <span>SCROLL TO ASCEND</span>
      </header>

      <section id="top" ref={sceneRef} className="parallax-header">
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

            <motion.div className="hero-copy" style={{ x: "-50%", y: titleY }}>
              <p>THE HIMALAYAS / NEPAL</p>
              <h1>BEYOND<br /><em>THE CLOUDS</em></h1>
              <span>Scroll into the silence.</span>
            </motion.div>

            <motion.div className="image-layer monastery-layer" style={{ y: monasteryY }}>
              <div className="monastery-entry">
                <Image src="/images/monastery-foreground-v2.png" alt="A Himalayan monastery with prayer flags" fill priority sizes="100vw" />
              </div>
            </motion.div>
          </div>

          <div className="fog-layer" aria-hidden="true">
            <Image src="/images/himalaya-clouds.jpg" alt="" fill priority sizes="100vw" />
            <div className="fog-light" />
          </div>

          <div className="parallax-fade" />

          <div className="progress-rail"><i><motion.b style={{ height: progress }} /></i><span>01</span></div>
          <div className="scroll-cue"><span>SCROLL</span><i /></div>
        </div>
      </section>

      <section className="closing-panel">
        <p>THE MOUNTAINS ARE CALLING</p>
        <h2>KEEP<br /><em>CLIMBING.</em></h2>
        <a href="mailto:hello@hima.travel">BEGIN THE JOURNEY ↗</a>
      </section>
    </main>
  );
}
