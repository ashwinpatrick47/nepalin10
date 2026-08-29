"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";

export type TextRevealHandle = {
  /** scale: transform scale (starts huge, ~4.6, settles at 1). opacity: 0-1, fades only at the very end once already small. */
  apply: (scale: number, opacity: number) => void;
};

export const TEXT_REVEAL_START_SCALE = 4.6;

type TextRevealProps = {
  children: ReactNode;
  /** Initial scale, must match whatever the caller's own progress formula uses at p=0 — otherwise the first frame blips from this default to the real value. */
  startScale?: number;
};

export default forwardRef<TextRevealHandle, TextRevealProps>(function TextReveal(
  { children, startScale = TEXT_REVEAL_START_SCALE },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    apply(scale: number, opacity: number) {
      const node = rootRef.current;
      if (!node) return;
      node.style.transform = `scale(${scale})`;
      node.style.opacity = `${opacity}`;
    },
  }));

  return (
    <div
      ref={rootRef}
      className="terrain-text-reveal"
      style={{ transform: `scale(${startScale})` }}
    >
      <p className="terrain-text-reveal-line">{children}</p>
    </div>
  );
});
