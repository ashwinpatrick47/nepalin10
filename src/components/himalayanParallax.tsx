"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import CinematicImageScroll, {
  type CinematicImageSlide,
} from "@/components/CinematicImageScroll";
import AnimatedStats from "@/components/AnimatedStats";
import ManifestoReveal from "@/components/terrain/ManifestoReveal";
import FoundationCharity from "@/components/FoundationCharity";
import RunnerChapter from "@/components/RunnerChapter";
import WhyNepalNote from "@/components/WhyNepalNote";
import BrandsGrid from "@/components/BrandsGrid";
import Testimonials from "@/components/Testimonials";
import Socials from "@/components/Socials";
import VideoReveal from "@/components/VideoReveal";
// Newsletter is temporarily out of the page (commented out below where
// it's rendered) — kept ready to switch back on, not deleted.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import TextStagger from "@/components/TextStagger";

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
  { number: "1027", label: "Kilometres distance" },
  { number: "01", label: "Path through highway" },
] as const;

export default function HimalayanParallax() {
  const sceneRef = useRef<HTMLElement>(null);
  const introRevealTimer = useRef<number | null>(null);
  // Only one of these two should ever be playing at a time — pressing the
  // Socials phone's "YouTube" link (which scrolls down to the documentary)
  // pauses the phone video so it doesn't keep playing off-screen, and
  // resuming the phone video (tapping it again) stops the documentary back
  // to its poster frame, and vice versa either direction.
  const [activePlayer, setActivePlayer] = useState<"phone" | "youtube">("phone");

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

  // Drives --scene-t (0-1): the page background + light text fade from the
  // dark map/ticker/RunnerChapter run to a light theme once RunnerChapter
  // itself has scrolled fully past, then hold at 1 (white) the rest of the
  // way down. Not the same timing as DiagonalReveal's own wipe on the
  // ticker (that one's driven separately, by its own scrollYProgress, so
  // the ticker's text always matches its own panel exactly — see
  // DiagonalReveal.tsx). This used to trigger right after the ticker text
  // disappeared, but RunnerChapter sits immediately after the ticker and is
  // itself a dark full-bleed section with its own hardcoded dark
  // background — the page bg was creeping white while still inside that
  // chapter, showing up as a visible seam between RunnerChapter's fixed
  // #111 and .story-content's lightening background around it. Anchoring
  // to RunnerChapter's own bottom keeps the whole dark run — map, ticker,
  // RunnerChapter — one consistent black until it's actually done. Read
  // every frame rather than on the "scroll" event — Lenis interpolates
  // scrollY smoothly, and a plain scroll listener misses most of that
  // motion. Two things kept this from being free before: re-querying the
  // DOM on every single frame, and calling setProperty on the root element
  // every frame even while t was unchanged (pinned at 0 or 1 for nearly the
  // entire page) — the latter forces a style recalc across every element
  // reading the variable, for the whole scroll session, not just the brief
  // window it's actually animating. Both fixed here: the element is looked
  // up once, and setProperty only fires when the rounded value actually
  // moves.
  // --dusk-t (0-1) is the same idea run a second time, in reverse: once
  // Our Partners has scrolled past, the shared background (and the text
  // colour mixed against it) ramps back from light to dark for the
  // Testimonials chapter onward, rather than Testimonials painting its own
  // separate dark rectangle that leaves a strip of the still-white shared
  // background showing around it. Anchored to .brands-section's bottom
  // edge the same way --scene-t is anchored to RunnerChapter's.
  useEffect(() => {
    const root = document.documentElement;
    const chapter = document.querySelector(".runner-chapter");
    const brands = document.querySelector(".brands-section");
    let rafId = 0;
    let lastSceneT = "";
    let lastDuskT = "";

    const update = () => {
      if (chapter) {
        const chapterBottom =
          chapter.getBoundingClientRect().bottom + window.scrollY;
        // Starts as soon as the chapter's bottom edge reaches the bottom of
        // the viewport (the chapter is fully on screen, not yet scrolled
        // past) rather than waiting for it to scroll fully out of view —
        // RunnerChapter has its own opaque background, so this ramp running
        // underneath it while it's still visible doesn't show. What it does
        // fix: "Why Nepal" can already be entering the viewport from below
        // while RunnerChapter's own text is still visible near the top of
        // the same frame (they briefly share the viewport), so the old
        // "wait until fully past" trigger left the background still black
        // by the time Why Nepal was on screen.
        const entryStart = chapterBottom - window.innerHeight * 0.5;
        const span = Math.max(1, window.innerHeight * 0.28);
        const t = Math.min(
          1,
          Math.max(0, (window.scrollY - entryStart) / span),
        );
        const next = t.toFixed(4);
        if (next !== lastSceneT) {
          lastSceneT = next;
          root.style.setProperty("--scene-t", next);
        }
      }
      if (brands) {
        const brandsBottom =
          brands.getBoundingClientRect().bottom + window.scrollY;
        const entryStart = brandsBottom - window.innerHeight * 0.5;
        const span = Math.max(1, window.innerHeight * 0.28);
        const t = Math.min(
          1,
          Math.max(0, (window.scrollY - entryStart) / span),
        );
        const next = t.toFixed(4);
        if (next !== lastDuskT) {
          lastDuskT = next;
          root.style.setProperty("--dusk-t", next);
        }
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      root.style.removeProperty("--scene-t");
      root.style.removeProperty("--dusk-t");
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
            <span>नेपाल</span>
          </div>
        </header>

        <div className="hero-rara-mark" aria-hidden="true">
          <Image src="/icons/rara.png" alt="" fill priority sizes="44px" />
        </div>

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
              <span>RARA RUNS</span>
            </span>

            <span className="title-mask title-serif">
              <em>NEPAL</em>
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

        {/* Old fog/ripple loading screen — replaced by <Preloader /> (mounted
        in layout.tsx, mirrors the Framer "Preloader-1" component: solid
        overlay, centered logo fades in/holds/fades out, then dispatches
        hima:intro-complete same as this used to). Left here commented out
        rather than deleted in case it's wanted back.
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
              src="/icons/rara.png"
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
        */}
      </section>

      <section
        className="story-content"
        aria-labelledby="story-title"
      >
        <div className="story-intro">
          <TextStagger as="p" className="story-kicker" variant="fade" text="The Endless Stretch" />
          <TextStagger
            as="h2"
            id="story-title"
            startDelay={0.15}
            lines={["Where the trail", <em key="em">becomes ritual.</em>]}
          />
        </div>

        <CinematicImageScroll images={storyWindows}>
          <p>
            The Mahendra Highway threads through nearly every terrain a runner can face in one country — heat, altitude, monsoon roads, mountain passes — compressed into a single unbroken line.
          </p>
        </CinematicImageScroll>

        <AnimatedStats stats={journeyStats} />

        <ManifestoReveal />

        <RunnerChapter />

        <WhyNepalNote />

        <FoundationCharity />

        <BrandsGrid />

        <Testimonials />

        <Socials
          paused={activePlayer === "youtube"}
          onPhonePlay={() => setActivePlayer("phone")}
          onYoutubeLinkClick={() => setActivePlayer("youtube")}
        />

        <VideoReveal
          stopped={activePlayer === "phone"}
          onPlay={() => setActivePlayer("youtube")}
        />

        <div className="why-nepal-brand-strip">
          <div className="why-nepal-brand-strip-red" aria-hidden="true" />
      </div>

        {/* Newsletter — commented out for now, not deleted; switch back on
            by uncommenting when it's wanted again. */}
        {/* <Newsletter /> */}
      </section>

      <Footer />
    </main>
  );
}
