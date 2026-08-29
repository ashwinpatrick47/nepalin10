"use client";

import { useRef } from "react";
import Image from "next/image";
import { useReducedMotion, useScroll, useTransform } from "framer-motion";
import MapLabels from "@/components/terrain/MapLabels";

export default function RunnerChapter() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // The background used to carry its own y parallax here (-7%/7%, tied to
  // this same scrollYProgress), but that drifted the whole time this
  // section sat pinned — including before WhyNepalNote even starts
  // sliding up to cover it — which read as the mountain photo aimlessly
  // panning on its own rather than staying put until the next section
  // arrives. Removed; scrollYProgress is kept only for windowImageY below.
  const windowImageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ["0%", "0%"] : ["-9%", "9%"],
  );

  return (
    <section ref={sectionRef} className="runner-chapter">
      {/* Same pinned-visuals-under-the-next-section pattern as the hero
          (.parallax-header / .parallax-visuals): this inner layer is what
          actually goes position:sticky, while the outer <section> above is
          the taller (220svh) box that gives it room to stay stuck long
          enough for WhyNepalNote's why-nepal-bio to slide up and cover it
          (see .why-nepal-bio's margin-top:-100svh in globals.css). */}
      <div className="runner-chapter-visuals">
        <div className="runner-chapter-parallax">
          <Image
            src="/images/himalaya-mountains.jpg"
            alt="A wide view across the Himalayan range"
            fill
            sizes="100vw"
          />
        </div>

        <div className="runner-chapter-shade" aria-hidden="true" />

        <div className="runner-chapter-window-stage">

        </div>

        {/* The "NEPAL IN 10" ticker's black strip, moved here from right
            after the map section — full width across the background image,
            not confined to the small window above. */}
        <div className="runner-chapter-ticker-strip">
          {/* <MapLabels /> */}
        </div>
      </div>
    </section>
  );
}

// comes after <div className="runner-chapter-window-stage"> so do not delete this block unless absolutely needed It may be added later but for the time being it is being commented out
//  <div className="runner-chapter-window">
//           <motion.div
//             className="runner-chapter-window-inner"
//             style={{ y: windowImageY }}
//           >
//             {/* Placeholder image — swap for the real one when it's ready */}
//             <Image
//               src="/images/himalayan-valley.png"
//               alt="Placeholder"
//               fill
//               sizes="(max-width: 700px) 90vw, 720px"
//             />
//           </motion.div>

//           {/* Static mark centred on the window — no scroll-triggered fade,
//               no load-in animation. */}
//           <div className="runner-chapter-window-logo" aria-hidden="true">
//             <Image
//               src="/icons/rara.png"
//               alt="Rara Runs Nepal"
//               width={220}
//               height={220}
//             />
//           </div>
//         </div>
