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
// mark, asics' navy, zuum's black text, the Amacx/Chasing Chai/Grens
// glow-PNGs — none of that original colour matters once it's just an alpha
// mask, so no per-logo invert/mute special-casing is needed.
// Seven sponsors — 4 on the top row, 3 on the bottom.
const SPONSORS: readonly { name: string; src: string }[] = [
  { name: "Asics", src: "/icons/asics.svg" },
  { name: "Plasmaide", src: "/icons/plasmaide.svg" },
  { name: "Chasing Chai", src: "/icons/chaisingchai.png" },
  { name: "Amacx", src: "/icons/amacx.png" },
  { name: "Grens", src: "/icons/grns.png" },
  { name: "Zuum", src: "/icons/zuum.svg" },
  { name: "Green Street", src: "/icons/greenstreet.webp" },
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
                  maskImage: `url(${sponsor.src})`,
                  WebkitMaskImage: `url(${sponsor.src})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
