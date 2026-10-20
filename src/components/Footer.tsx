"use client";

import { usePathname } from "next/navigation";
import { TRACKER_URL, TRACKING_LIVE } from "@/components/trackerUrl";

// Ported from framer.com/m/Footer-Oversized-Wordmark: a brand block next
// to link columns, a copyright/credit row below with no divider between
// them, then a giant wordmark filling the width with its top edge faded
// into the background. The source's 4-column nav-link grid (Quick Link /
// Company / Others / Social) is trimmed to the two columns this
// single-page site actually has real links for — Quick Links (anchors
// into the sections below, matching the "Company"/"Others" columns'
// role of internal navigation) and Social — rather than padding it out
// with placeholder columns like the source's own "Blog"/"404"/"License"
// links, which don't correspond to anything on this site. Brand mark
// uses the site's own rara.png emblem (same mark as the preloader and
// RunnerChapter window) next to a bold event-name heading, echoing the
// source's bold "FUTER" wordmark instead of a small icon-and-label row.
const QUICK_LINKS: readonly { label: string; href: string }[] = [
  { label: "Home", href: "#top" },
  { label: "Foundation", href: "#foundation" },
  { label: "Our Partners", href: "#partners" },
  { label: "Documentary", href: "#documentary" },
  { label: "Creator of the website", href:"https://www.linkedin.com/in/ashwinpatrick/"}
];

const SOCIAL_LINKS: readonly { label: string; href: string }[] = [
  { label: "Strava", href: "https://strava.app.link/s3XOnzJsq6b" },
  { label: "Instagram", href: "https://www.instagram.com/rahuljsharma_/" },
  { label: "YouTube", href: "https://www.youtube.com/@ebbnflofilm" },
  { label: "Linktree", href: "https://linktr.ee/rahuljsharma" },
  { label: "Track me", href: TRACKER_URL },
];

export default function Footer() {
  // The Quick Links are section anchors that only exist on the homepage.
  // Elsewhere (e.g. /shop) a bare "#foundation" has nothing to scroll to,
  // so those links are prefixed back to "/" there — a normal navigation to
  // the homepage section — while staying same-page anchors (Lenis-smoothed)
  // when the footer is already rendered on the homepage itself.
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <div className="site-footer-brand-marks">
            <div
              className="site-footer-brand-mark"
              role="img"
              aria-label="Nepal in 10"
              style={{
                maskImage: "url(/images/logo/rara.png)",
                WebkitMaskImage: "url(/images/logo/rara.png)",
              }}
            />
            <img
              className="site-footer-brand-logo"
              src="/images/logo/logo.png"
              alt="Ebb&Flo"
            />
          </div>
          {/* <p>A crossing of Nepal, told in ten days on foot.</p> */}
        </div>

        <div className="site-footer-nav">
          <img
            className="site-footer-nav-title"
            src="/images/logo/title.png"
            alt="Ebb&Flo"
          />

          <div className="site-footer-nav-badge">
            <img
              className="site-footer-nav-flag"
              src="/images/logo/flag.svg"
              alt="Flag of Nepal"
            />
            <span>In cooperation with the Government of Nepal</span>
          </div>

          <div className="site-footer-columns">
            <div className="site-footer-column">
              <span className="site-footer-column-title">Quick Links</span>
              {QUICK_LINKS.map((link) => {
                const isAnchor = link.href.startsWith("#");
                const href = isAnchor && !isHome ? `/${link.href}` : link.href;
                return (
                  <a
                    key={link.label}
                    href={href}
                    onClick={
                      isAnchor && isHome
                        ? (event) => {
                            event.preventDefault();
                            // Also stop this from reaching Lenis's own
                            // window-level anchors:true click listener —
                            // that auto-handler computes its target using
                            // Lenis's internally tracked scroll position,
                            // which can be stale (e.g. right after the intro
                            // forces a native scroll reset outside Lenis's
                            // own API) and lands far from the right section.
                            // Scrolling explicitly here, from the real
                            // window.scrollY, sidesteps that.
                            event.stopPropagation();
                            const target = document.getElementById(link.href.slice(1));
                            if (!target) return;
                            const top = target.getBoundingClientRect().top + window.scrollY;
                            const lenis = window.__lenis;
                            if (lenis) lenis.scrollTo(top, { force: true });
                            else window.scrollTo({ top, behavior: "smooth" });
                          }
                        : undefined
                    }
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            <div className="site-footer-column">
              <span className="site-footer-column-title">Social</span>
              {SOCIAL_LINKS.map((social) => {
                const isTrackMe = social.label === "Track me";
                if (isTrackMe && !TRACKING_LIVE) {
                  return (
                    <span
                      key={social.label}
                      className="is-disabled"
                      aria-disabled="true"
                      title="Tracking starts once the run begins"
                    >
                      {social.label}
                    </span>
                  );
                }
                return (
                  <a key={social.label} href={social.href}>
                    {social.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>&copy; 2026 Nepal in 10 · An Ebb&Flo project</span>
        
      </div>

      <div className="site-footer-wordmark" aria-hidden="true">
        <span>Nepal in 10</span>
      </div>
    </footer>
  );
}
