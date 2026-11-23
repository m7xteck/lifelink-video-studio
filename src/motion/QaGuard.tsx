import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { type } from "../brand/tokens";

/**
 * Automatic layout inspector that runs inside every rendered frame.
 * It looks at all elements marked data-qa-text and reports (via console
 * messages captured by the render pipeline) any text that:
 *  - extends outside the frame,
 *  - is rendered smaller than the brand's minimum readable size,
 *  - overlaps another text block in the same scene.
 * These become objective pass/fail items in the QA report.
 */
export const QaGuard: React.FC = () => {
  const frame = useCurrentFrame();
  // Remount per frame so each frame gets its own delayRender handle.
  return <QaGuardFrame key={frame} frame={frame} />;
};

const QaGuardFrame: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height } = useVideoConfig();
  const [handle] = useState(() => delayRender("qa-guard", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    let released = false;
    const release = () => { if (!released) { released = true; continueRender(handle); } };
    const run = async () => {
      try {
        await document.fonts.ready;
        const els = Array.from(document.querySelectorAll<HTMLElement>("[data-qa-text]"));
        const visible = els.filter((el) => {
          const r = textRect(el);
          return r.width > 0 && r.height > 0 && effectiveOpacity(el) > 0.5;
        });
        const issues: Record<string, unknown>[] = [];
        for (const el of visible) {
          const r = textRect(el);
          const tol = 2;
          if (r.left < -tol || r.top < -tol || r.right > width + tol || r.bottom > height + tol) {
            issues.push({ kind: "outside-frame", text: snippet(el), rect: rr(r) });
          }
          const fs = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
          if (fs < type.minReadablePx - 0.5) issues.push({ kind: "text-too-small", text: snippet(el), px: Math.round(fs) });
        }
        for (let i = 0; i < visible.length; i++) {
          for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i], b = visible[j];
            if (a.contains(b) || b.contains(a)) continue;
            const sa = a.closest("[data-scene]")?.getAttribute("data-scene");
            const sb = b.closest("[data-scene]")?.getAttribute("data-scene");
            if (!sa || sa !== sb) continue;
            const ra = textRect(a), rb = textRect(b);
            const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
            const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
            if (ix > 4 && iy > 4) issues.push({ kind: "text-overlap", a: snippet(a), b: snippet(b), scene: sa });
          }
        }
        if (issues.length) console.warn("LIFELINK_QA " + JSON.stringify({ frame, issues }));
        release();
      } catch (e) {
        cancelRender(e as Error);
      }
    };
    run();
    return release;
  }, [frame, handle, width, height]);
  return null;
};

const snippet = (el: HTMLElement) => (el.textContent ?? "").trim().slice(0, 60);
const rr = (r: DOMRect) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
const effectiveOpacity = (el: HTMLElement | null) => {
  let o = 1;
  while (el) { o *= parseFloat(getComputedStyle(el).opacity || "1"); el = el.parentElement; }
  return o;
};
const scaleOf = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return el.offsetWidth > 0 ? r.width / el.offsetWidth : 1;
};

/** Bounding box of the actual glyphs, not the (possibly wider) block element. */
const textRect = (el: HTMLElement): DOMRect => {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
};
