"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

const YOUTUBE_ID = "xniu1-LeFkw";

// Plain rounded video card with a one-time scroll-in reveal (same
// whileInView treatment every other media frame on the page uses) — the
// scroll-pinned "grows from a tiny pill" version didn't work out. Video is
// a click-to-play facade (YouTube's own thumbnail, swapped for the real
// iframe on click) rather than an iframe mounted from the start.
//
// The card is its own motion.div, deliberately *not* nested inside
// CinematicTextReveal with the rest of this section's copy — that
// wrapper's reveal animates `filter: blur(...)`, and a `filter` on any
// ancestor of a YouTube iframe forces the browser off the normal
// hardware-video compositing path in some browsers, which is what was
// rendering as "controls fine, video itself solid black" once played.
// This card's own reveal only animates opacity/y, no filter, so nothing
// upstream of the iframe ever gets one.
interface VideoRevealProps {
  // True while the Socials phone video has taken over — pauses the
  // documentary (via the YouTube iframe API) and brings the poster back
  // over it, so the two never play at once. The iframe itself stays
  // mounted rather than being torn down, so resuming afterwards continues
  // from wherever playback left off instead of restarting from 0:00 —
  // swapping the iframe's src (or unmounting it) is what was throwing
  // playback position away before.
  stopped?: boolean;
  // Fires when this video starts (or resumes) playing, so the page can
  // pause the phone video in turn — the two are mutually exclusive.
  onPlay?: () => void;
}

export default function VideoReveal({ stopped = false, onPlay }: VideoRevealProps) {
  const reduceMotion = useReducedMotion();
  // "started" — the iframe has been created at least once and stays
  // mounted from then on. "playing" — whether it's the current active
  // player (poster hidden) right now; toggling this alone, once started,
  // pauses/resumes the same iframe instead of destroying it.
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendPlayerCommand = (func: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*",
    );
  };

  useEffect(() => {
    if (stopped && playing) {
      sendPlayerCommand("pauseVideo");
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the
    // "stopped" transition itself should trigger this, not every render
    // where "playing" happens to be read.
  }, [stopped]);

  return (
    <>
      <div className="video-reveal-intro" id="documentary">
        <TextStagger as="span" className="narrative-kicker" text="Watch the documentary" />
        <TextStagger as="h2" className="video-reveal-heading" text="Born to Fly" startDelay={0.15} />
        <CinematicTextReveal className="video-reveal-body" delay={0.3}>
          <p>
            Before Nepal, there was Sri Lanka — 568 kilometres crossed on foot
            in just 6 days, becoming the first person to run the length of the
            island. Blistered feet, brutal heat and long nights alone on the
            road tested him long before this attempt began; Born to Fly is the
            record of how he got through it.
          </p>
        </CinematicTextReveal>
      </div>

      <motion.div
        className="video-reveal-card"
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {started && (
          <div className="video-reveal-embed">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?start=0&autoplay=1&rel=0&enablejsapi=1`}
              title="Rahul Sharma — Born to Fly"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {!playing && (
          <button
            type="button"
            className="video-reveal-poster"
            onClick={() => {
              onPlay?.();
              if (started) sendPlayerCommand("playVideo");
              else setStarted(true);
              setPlaying(true);
            }}
            aria-label={started ? "Resume Born to Fly" : "Play Born to Fly"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail CDN isn't in next.config's image domains, and it's not worth adding just for one poster frame. */}
            <img
              src={`https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
              alt=""
            />
            <span className="video-reveal-play">
              <span className="video-reveal-play-icon" aria-hidden="true">
                &#9654;
              </span>

            </span>
          </button>
        )}
      </motion.div>
    </>
  );
}
