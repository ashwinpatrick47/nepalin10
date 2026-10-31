"use client";

import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

// Layout modelled on norda.framer.website's "Our Partners" section: a
// large heading + supporting line above a grid of bracket-framed tiles,
// rather than a quiet single row under a small kicker.
//
// Each mark renders as a flat silhouette via CSS mask-image (background:
// currentColor, masked by the logo's own alpha channel) rather than the
// image itself — grey at rest, the site's pink (#ff0052) on hover. That
// sidesteps the mixed-source problem entirely: Green Street's cream/white
// mark, zuum's black text, the Amacx/Chasing Chai/Grens glow-PNGs — none
// of that original colour matters once it's just an alpha
// mask, so no per-logo invert/mute special-casing is needed.
// Eight sponsors — 4 per row (see .brands-row in globals.css).
const SPONSORS: readonly { name: string; src: string }[] = [
  { name: "Plasmaide", src: "/images/logo/brands/plasmaide.svg" },
  { name: "Chasing Chai", src: "/images/logo/brands/chaisingchai.png" },
  { name: "Amacx", src: "/images/logo/brands/amacx.png" },
  { name: "Grens", src: "/images/logo/brands/grns.png" },
  { name: "Zuum", src: "/images/logo/brands/zuum.svg" },
  { name: "Green Street", src: "/images/logo/brands/greenstreet.webp" },
  { name: "Mount to Coast", src: "/images/logo/brands/mount-to-coast.png" },
  // project-transcend.png is a silhouette PNG derived from the original
  // Project Transcend-black.jpg (which has no alpha channel — the mask
  // technique below needs one, a flat JPG would render as a solid block
  // instead of the logo's shape).
  { name: "Project Transcend", src: "/images/logo/brands/project-transcend.png" },
];

export default function BrandsGrid() {
  return (
    <section className="brands-section" id="partners">
      <div className="brands-intro">
        <TextStagger as="span" className="narrative-kicker" text="In partnership with" />
        <TextStagger as="h2" className="brands-heading" text="Our Partners" startDelay={0.15} />
        <CinematicTextReveal className="brands-body" delay={0.3}>
          <p>
            Gear, nutrition and logistics partners backing the crossing —
            each one signed on before a single kilometre was run.
          </p>
        </CinematicTextReveal>
      </div>

      <div className="brands-row">
        {SPONSORS.map((sponsor) => (
          <div key={sponsor.name} className="brand-tile" aria-label={sponsor.name}>
            <div className="brand-logo">
              <span
                className="brand-logo-mask"
                style={{
                  // Quoted: an unquoted CSS url() breaks on literal spaces in
                  // the path (e.g. a logo file saved with spaces in its
                  // name), silently dropping the whole mask-image — quoting
                  // makes this safe regardless of the filename.
                  maskImage: `url("${sponsor.src}")`,
                  WebkitMaskImage: `url("${sponsor.src}")`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
