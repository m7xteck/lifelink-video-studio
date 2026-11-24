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
          // Miniature thumbnails (e.g. chapterRecap's still signature cards) are pictures, not reading text.
          if (el.closest("[data-qa-ignore]")) return false;
          const r = textRect(el, width, height);
          const onScreen = r.right > 0 && r.bottom > 0 && r.left < width && r.top < height;
          return r.width > 0 && r.height > 0 && onScreen && effectiveOpacity(el) > 0.5;
        });
        const issues: Record<string, unknown>[] = [];
        for (const el of visible) {
          const r = textRect(el, width, height);
          const tol = 2;
          const fullyOutside = r.right <= 0 || r.bottom <= 0 || r.left >= width || r.top >= height;
          // Fully off-screen text (e.g. a card still sliding in) is invisible, not clipped. Only partial clipping is a defect.
          if (!fullyOutside && (r.left < -tol || r.top < -tol || r.right > width + tol || r.bottom > height + tol)) {
            issues.push({ kind: "outside-frame", text: snippet(el), rect: rr(r) });
          }
          const fs = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
          if (fs < type.minReadablePx - 0.5) issues.push({ kind: "text-too-small", text: snippet(el), px: Math.round(fs) });
        }
        for (let i = 0; i < visible.length; i++) {
          for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i], b = visible[j];
            if (a.contains(b) || b.contains(a)) continue;
            // Deliberate typographic overlaps (e.g. script crossing a headline) are declared in the component.
            if (a.closest("[data-qa-overlap-ok]") || b.closest("[data-qa-overlap-ok]")) continue;
            const sa = a.closest("[data-scene]")?.getAttribute("data-scene");
            const sb = b.closest("[data-scene]")?.getAttribute("data-scene");
            if (!sa || sa !== sb) continue;
            const ra = textRect(a, width, height), rb = textRect(b, width, height);
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

/**
 * Bounding box of the glyphs that are actually VISIBLE: each text node's box is clipped by
 * every overflow-hidden ancestor (e.g. letterpress masks), so hidden letters waiting below
 * their mask are not counted. Returns an empty rect when nothing is visible.
 */
const textRect = (el: HTMLElement, W = window.innerWidth, H = window.innerHeight): DOMRect => {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    let { left, top, right, bottom } = range.getBoundingClientRect();
    for (let p = n.parentElement; p && right > left && bottom > top; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const c = p.getBoundingClientRect();
        // Full-frame containers are not masks: clipping by them would hide genuine off-frame overflow.
        if (c.width >= W - 1 && c.height >= H - 1) continue;
        left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom);
      }
      if (p === document.body) break;
    }
    if (right > left && bottom > top) { l = Math.min(l, left); t = Math.min(t, top); r = Math.max(r, right); b = Math.max(b, bottom); }
  }
  return l === Infinity ? new DOMRect(0, 0, 0, 0) : new DOMRect(l, t, r - l, b - t);
};
