"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";
import { NEPAL_COORDINATES } from "@/components/terrain/terrainRoute";

// Same "NEPAL IN 10 / नेपाल १० दिनमा / coords" chain as the MapLabels
// ticker further up the page — brought in here as a plain decorative
// backdrop behind the phone (no DiagonalReveal wrapper, no scroll-linked
// sweep: that effect is tied to its own section entrance, not appropriate
// for something meant to just sit and loop behind another element).
const TICKER_PHRASES = ["NEPAL IN 10", "नेपाल १० दिनमा"];
const TICKER_REPEAT = 6;

// Phone mockup styled after github.com/PhurpaSherpa16/Project-Nepal's
// PhoneFrame component (rounded chrome, dynamic-island notch, status bar,
// home indicator) — the screen shows a plain photo rather than a
// fabricated Instagram-post overlay (fake like/comment counts, a caption
// attributed to a real handle), since there's no actual post behind it.
// Links are text-only, not platform logos — there's no brand-asset SVGs
// for these four in the project, and a rough hand-drawn approximation of
// a trademarked logo would look worse than no icon at all.
//
// One row of links below the phone, evenly spaced across its full width
// (space-evenly) rather than flanking its sides — simpler and reads more
// clearly as a single group of options.
const SOCIAL_LINKS: readonly { label: string; href: string }[] = [
  { label: "Strava", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#documentary" },
  { label: "Linktree", href: "#" },
];

// Status bar icons (signal/wifi/battery) — commented out per request, not
// deleted, since the phone chrome (notch/home indicator) still wants the
// option back. See the commented .socials-phone-status block below too.
// function SignalIcon() {
//   return (
//     <svg viewBox="0 0 18 12" width="14" height="10" fill="currentColor" aria-hidden="true">
//       <rect x="0" y="8" width="3" height="4" rx="0.5" />
//       <rect x="5" y="5.5" width="3" height="6.5" rx="0.5" />
//       <rect x="10" y="3" width="3" height="9" rx="0.5" />
//       <rect x="15" y="0" width="3" height="12" rx="0.5" />
//     </svg>
//   );
// }
//
// function WifiIcon() {
//   return (
//     <svg viewBox="0 0 16 12" width="14" height="10" fill="none" aria-hidden="true">
//       <path
//         d="M1 4.5C5.5 0.5 10.5 0.5 15 4.5"
//         stroke="currentColor"
//         strokeWidth="1.6"
//         strokeLinecap="round"
//       />
//       <path
//         d="M3.5 7.3C6.7 4.6 9.3 4.6 12.5 7.3"
//         stroke="currentColor"
//         strokeWidth="1.6"
//         strokeLinecap="round"
//       />
//       <circle cx="8" cy="10.3" r="1.3" fill="currentColor" />
//     </svg>
//   );
// }
//
// function BatteryIcon() {
//   return (
//     <svg viewBox="0 0 25 12" width="22" height="10" fill="none" aria-hidden="true">
//       <rect x="0.75" y="0.75" width="20.5" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
//       <rect x="2.5" y="2.5" width="17" height="7" rx="1.3" fill="currentColor" />
//       <path d="M23 4v4a1.5 1.5 0 0 0 0-4Z" fill="currentColor" />
//     </svg>
//   );
// }

interface SocialsProps {
  // True while the documentary video (VideoReveal) has taken over —
  // pauses this video and blocks it from being resumed by a tap until
  // the documentary itself stops again.
  paused?: boolean;
  // Fires when this video starts playing, so the page can stop the
  // documentary in turn — the two are mutually exclusive.
  onPhonePlay?: () => void;
  onYoutubeLinkClick?: () => void;
}

export default function Socials({ paused = false, onPhonePlay, onYoutubeLinkClick }: SocialsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const phoneWrapRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const [showHint, setShowHint] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) videoRef.current?.pause();
  }, [paused]);

  // Tracks whether the video actually ended up muted (autoplay-with-sound is
  // often blocked by the browser unless a real click/tap just happened), so
  // the on-screen hint can say the right thing: "tap for sound" while muted,
  // "tap to pause" once it isn't.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setIsMuted(video.muted);
    video.addEventListener("volumechange", sync);
    return () => video.removeEventListener("volumechange", sync);
  }, []);

  // First time the phone scrolls into view, start it playing on its own,
  // audio and all. Most browsers only allow unmuted autoplay once the page
  // has already seen a user gesture (a click/tap earlier on the page), which
  // by this point in the scroll it usually has — but if the browser still
  // blocks it, fall back to a muted autoplay so motion starts either way;
  // the first tap on the screen (see togglePlay) then unmutes it.
  useEffect(() => {
    const video = videoRef.current;
    const target = phoneWrapRef.current;
    if (!video || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pausedRef.current) {
          onPhonePlay?.();
          video.muted = false;
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount, "onPhonePlay" identity isn't meant to re-trigger the observer.
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setShowHint(false);
    if (video.muted) {
      video.muted = false;
      onPhonePlay?.();
      if (video.paused) video.play();
      return;
    }
    if (video.paused) {
      onPhonePlay?.();
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <section className="socials-section">
      <TextStagger as="span" className="narrative-kicker" text="Follow the journey" />
      <TextStagger as="h2" className="socials-heading" text="I'm on socials" startDelay={0.15} />

      <CinematicTextReveal className="socials-stage" delay={0.3}>
        <div className="socials-phone-wrap" ref={phoneWrapRef}>
          <div className="socials-ticker-backdrop" aria-hidden="true">
            <div className="socials-ticker-track">
              {Array.from({ length: TICKER_REPEAT }).map((_, index) => {
                const phraseIndex = index % TICKER_PHRASES.length;
                const isNepali = phraseIndex === 1;
                return (
                  <Fragment key={index}>
                    <span className={`socials-ticker-item${isNepali ? " socials-ticker-item-nepali" : ""}`}>
                      {TICKER_PHRASES[phraseIndex]}
                    </span>
                    <span className="socials-ticker-coord">{NEPAL_COORDINATES}</span>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div className="socials-phone">
          {/* <div className="socials-phone-status">
            <span className="socials-phone-status-icons">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div> */}
          <div className="socials-phone-notch" aria-hidden="true" />
          <div
            className="socials-phone-screen"
            role="button"
            tabIndex={0}
            aria-label="Play or pause video"
            onClick={togglePlay}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                togglePlay();
              }
            }}
          >
            <video
              ref={videoRef}
              className="socials-phone-video"
              src="/images/socials.mp4"
              loop
              playsInline
            />
            {showHint && (
              <span className="socials-phone-hint">{isMuted ? "Tap for sound" : "Tap screen to pause"}</span>
            )}
          </div>
          <div className="socials-phone-home" aria-hidden="true" />
          </div>
        </div>

        <div className="socials-links-row">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              className="socials-link"
              href={social.href}
              onClick={social.label === "YouTube" ? onYoutubeLinkClick : undefined}
            >
              {social.label}
            </a>
          ))}
        </div>
      </CinematicTextReveal>
    </section>
  );
}
