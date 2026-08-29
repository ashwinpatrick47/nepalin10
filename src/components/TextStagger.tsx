"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";

// Per-line stagger reveal: each line is masked behind its own
// `overflow:hidden` band and slides up from y:100% (of its own line
// height, so it scales correctly across wildly different font sizes —
// an 11px kicker and a 76px heading both fully hide/reveal within their
// own line box) with a per-line delay, once this element scrolls into
// view. Ported from a Framer code component; Framer's own SDK
// (`addPropertyControls`/`ControlType`, editor-only) is gone since
// there's no property panel here — typography comes from `className`
// (this codebase's existing convention) instead of an inline font object.
//
// Two input modes:
// - `text`: a single plain string. Lines are auto-detected by measuring
//   actual rendered wraps (character-by-character, via Range —
//   necessary because line count depends on runtime width/viewport, not
//   just character count), re-measured on resize.
// - `lines`: an explicit array of pre-split line content, for headings
//   that need per-line styling (e.g. a colored/italic last line) rather
//   than uniform auto-wrapped text — skips measurement entirely.
interface TextStaggerProps {
  text?: string;
  lines?: ReactNode[];
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  id?: string;
  delay?: number;
  duration?: number;
  startDelay?: number;
  // Gate for reveals that must wait on something other than scroll
  // position — e.g. the hero heading, which is in the viewport from
  // first paint (so inView is true immediately) but shouldn't stagger in
  // until the boot/preloader sequence actually reveals it. Defaults to
  // true, so every ordinary scroll-triggered usage is unaffected.
  startWhen?: boolean;
  // "mask" (default) slides each line up from behind its own
  // overflow:hidden band — reads as intended for body/heading-sized text,
  // where a partially-revealed line still shows recognizable partial
  // letterforms. At very small sizes with heavy tracking (e.g. an 8-11px
  // uppercase kicker), a partial slide instead looks like a row of
  // disconnected fragments — there isn't enough of any single glyph
  // visible at once to read as text-in-motion. "fade" skips the mask
  // entirely and just fades/lifts the line in, which never has that
  // failure mode regardless of size.
  variant?: "mask" | "fade";
}

export default function TextStagger({
  text,
  lines,
  as: Tag = "div",
  className,
  style,
  id,
  delay = 0.08,
  duration = 0.6,
  startDelay = 0,
  startWhen = true,
  variant = "mask",
}: TextStaggerProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [measuredLines, setMeasuredLines] = useState<string[]>(text ? [text] : []);
  // margin shrinks the effective viewport by 18% from the bottom before
  // counting anything as "in view". Without it, a small block that's
  // physically sliding up from below (e.g. a section that overlaps and
  // covers whatever's pinned above it) hits the 60% threshold while still
  // straddling the bottom edge of the screen — the reveal plays out at the
  // same time the browser's own viewport is still cropping the lower
  // lines, which reads as broken/half-clipped even though each piece is
  // individually correct. This just delays the trigger until the element
  // has actually cleared the fold.
  const inView = useInView(containerRef, { once: true, amount: 0.6, margin: "0px 0px -18% 0px" });
  const controls = useAnimationControls();
  const [hasAnimated, setHasAnimated] = useState(false);

  // Re-measuring once document.fonts.ready fires (below) corrects a wrong
  // line split eventually, but if the reveal had already played against
  // the fallback (Arial) measurement by then, the user sees the wrong,
  // clipped layout for a moment before it snaps to the right one. Gating
  // the reveal itself on fonts being ready — not just re-measuring after —
  // means the first thing scrolled into view is already correct.
  const [fontsReady, setFontsReady] = useState(
    () => typeof document === "undefined" || !document.fonts || document.fonts.status === "loaded",
  );
  useEffect(() => {
    if (fontsReady || typeof document === "undefined" || !document.fonts) return;
    document.fonts.ready.then(() => setFontsReady(true));
  }, [fontsReady]);

  useLayoutEffect(() => {
    if (lines || !text || typeof window === "undefined") return;
    const element = measureRef.current;
    if (!element) return;

    const measure = () => {
      const textNode = element.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

      // getClientRects() on the whole run returns exactly one DOMRect per
      // *actual* visual line, computed by the browser's own line-box
      // model — the authoritative line count/bounds, not a guess. Each
      // character is then bucketed into whichever line's vertical center
      // its own center is closest to. This replaced an earlier approach
      // that grew a range char-by-char and watched its cumulative
      // bounding-box bottom for a jump: that heuristic broke the moment a
      // descender showed up (e.g. the "y" in "Why"), since adding a
      // deeper-descending glyph shifts the range's bottom edge even
      // though it's still the same line — misread as a wrap and split
      // mid-word into garbled, overlapping fragments.
      const fullRange = document.createRange();
      fullRange.selectNodeContents(element);
      const lineRects = Array.from(fullRange.getClientRects()).sort((a, b) => a.top - b.top);
      if (lineRects.length === 0) {
        setMeasuredLines([text]);
        return;
      }

      const charRange = document.createRange();
      const lines: string[] = Array.from({ length: lineRects.length }, () => "");

      for (let i = 0; i < text.length; i++) {
        charRange.setStart(textNode, i);
        charRange.setEnd(textNode, i + 1);
        const rect = charRange.getBoundingClientRect();
        const center = (rect.top + rect.bottom) / 2;

        let closest = 0;
        let closestDistance = Infinity;
        for (let l = 0; l < lineRects.length; l++) {
          const lineCenter = (lineRects[l].top + lineRects[l].bottom) / 2;
          const distance = Math.abs(center - lineCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = l;
          }
        }
        lines[closest] += text[i];
      }

      const result = lines.filter((line) => line.length > 0);
      setMeasuredLines(result.length ? result : [text]);
    };

    measure();
    window.addEventListener("resize", measure);

    // A plain resize listener misses it when the measure span's own
    // width changes without the window resizing — e.g. a sibling image
    // finishing layout, a grid track settling. ResizeObserver catches
    // that regardless of cause. It does NOT, however, catch a web font
    // swapping in after first paint: the measure span is pinned to its
    // parent's box via inset:0, so a font swap changes the GLYPH widths
    // inside that fixed-size box without changing the box's own
    // dimensions — nothing for ResizeObserver to see. Left unhandled,
    // the very first measurement (run before "BDO Grotesk" finishes
    // downloading) locks in line breaks computed against the Arial
    // fallback's glyph widths; once the real font swaps in a moment
    // later, the actual rendered text re-wraps at different points than
    // what got measured, so previously-adjacent per-line masks stop
    // lining up with the real line boundaries — visible as clipped
    // glyphs and lines overlapping each other. document.fonts.ready
    // re-measures once the real font is actually active.
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    document.fonts?.ready.then(measure);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [text, lines]);

  useEffect(() => {
    if (reduceMotion || hasAnimated || !inView || !startWhen || !fontsReady) return;
    controls.start((i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: startDelay + i * delay,
        duration,
        ease: [0.44, 0, 0.34, 0.98],
      },
    }));
    setHasAnimated(true);
  }, [inView, reduceMotion, hasAnimated, startWhen, fontsReady, controls, delay, duration, startDelay]);

  const displayLines: ReactNode[] = lines ?? measuredLines;

  // <p> and <span> only permit phrasing content — a <div> nested inside
  // either (e.g. a `lines` entry that's itself a flex row, like a stat
  // line) triggers a parse-time auto-close and a hydration mismatch. Any
  // other host tag (div, h1-h6, ...) is already a block context, so the
  // mask/motion wrapper can safely be a div there instead.
  const LineMask = Tag === "span" || Tag === "p" ? "span" : "div";
  const MotionLine = LineMask === "span" ? motion.span : motion.div;

  return (
    <Tag ref={containerRef} id={id} className={className} style={{ ...style, position: "relative" }}>
      {!lines && text ? (
        <span
          ref={measureRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            visibility: "hidden",
            whiteSpace: "pre-wrap",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      ) : null}
      {displayLines.map((line, i) => (
        // text-indent (e.g. .why-nepal-bio-headline's first-line indent)
        // applies per block container — since every line here is now its
        // own block, only the first should inherit it; the rest are
        // pinned to 0 so the indent doesn't repeat on every line.
        <LineMask key={i} style={{ display: "block", overflow: variant === "fade" ? "visible" : "hidden", textIndent: i === 0 ? undefined : 0 }}>
          <MotionLine
            custom={i}
            initial={reduceMotion ? false : variant === "fade" ? { opacity: 0, y: 10 } : { opacity: 0, y: "100%" }}
            animate={reduceMotion ? undefined : controls}
            // display:block, not inline-block — inline-block sizes itself
            // via shrink-to-fit, which wraps text using a different
            // algorithm than the plain block-flow text the line was
            // measured against (see the `text` mode measurement above),
            // so the two would sometimes disagree on where a line breaks
            // once space got tight (e.g. behind a first-line text-indent)
            // and visibly re-wrap mid-line after already being split.
            style={{ display: "block", willChange: "transform" }}
          >
            {line}
          </MotionLine>
        </LineMask>
      ))}
    </Tag>
  );
}
