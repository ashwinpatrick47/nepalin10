"use client";

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
  { label: "Strava", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "Linktree", href: "#" },
];

export default function Footer() {
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
                maskImage: "url(/icons/rara.png)",
                WebkitMaskImage: "url(/icons/rara.png)",
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
              {QUICK_LINKS.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>

            <div className="site-footer-column">
              <span className="site-footer-column-title">Social</span>
              {SOCIAL_LINKS.map((social) => (
                <a key={social.label} href={social.href}>
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>&copy; 2026 Ebb&Flo. All rights reserved.</span>
        
      </div>

      <div className="site-footer-wordmark" aria-hidden="true">
        <span>Nepal in 10</span>
      </div>
    </footer>
  );
}
