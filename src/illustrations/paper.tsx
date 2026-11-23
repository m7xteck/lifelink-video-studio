import React from "react";
import { interpolate } from "remotion";
import { ease } from "../brand/tokens";
import { useNarrationTime, useProgress } from "../motion/time";

/**
 * Paper-cut illustration toolkit (LifeLink "paper and ink").
 * Everything is drawn in an SVG with a fixed 1920×1080 viewBox, so illustrations are resolution-independent.
 * - <PaperDefs/>: shared shadow filters (one per depth) – include once per SVG.
 * - <Layer/>: a cut-paper shape that rises into place with a soft shadow.
 * - <Ink/>: a stroked line that draws itself.
 * - useSway: slow, tiny oscillation for living elements (leaves, needle).
 */

export const PaperDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    {[1, 2, 3].map((d) => (
      // userSpaceOnUse: a fixed region, so shadows also work on perfectly straight (zero-width) lines
      <filter key={d} id={`${id}-shadow-${d}`} filterUnits="userSpaceOnUse" x="-300" y="-300" width="2520" height="1680">
        <feDropShadow dx="0" dy={3 + d * 3} stdDeviation={4 + d * 4} floodColor="#1a0a0a" floodOpacity={0.12 + d * 0.05} />
      </filter>
    ))}
  </defs>
);

/** A cut-paper shape. `depth` (1–3) sets shadow strength; it rises `rise` px into place from `at`. */
export const Layer: React.FC<{
  id: string; d: string; fill: string; at: number; depth?: 1 | 2 | 3; rise?: number; dur?: number; drift?: number; opacity?: number;
}> = ({ id, d, fill, at, depth = 2, rise = 40, dur = 1.6, drift = 0, opacity = 1 }) => {
  const p = useProgress(at, dur, ease.settle);
  const t = useNarrationTime();
  const dx = drift * (t - at);
  return (
    // paper is opaque: it rises into place and becomes solid almost immediately (no see-through layers)
    <path d={d} fill={fill} filter={`url(#${id}-shadow-${depth})`} opacity={Math.min(1, p * 5) * opacity}
      transform={`translate(${dx.toFixed(2)} ${((1 - p) * rise).toFixed(2)})`} />
  );
};

/** An ink line that draws itself from `at` over `dur` seconds. */
export const Ink: React.FC<{ d: string; color: string; width?: number; at: number; dur?: number; dash?: string; opacity?: number; cap?: "round" | "butt" }> = ({ d, color, width = 2.5, at, dur = 1.4, dash, opacity = 1, cap = "round" }) => {
  const p = useProgress(at, dur, ease.settle);
  if (dash) {
    // dashed lines: reveal with a clip-like dashoffset on a solid mask path
    return (
      <g opacity={opacity}>
        <mask id={`m-${Math.abs(hash(d))}`}><path d={d} stroke="#fff" strokeWidth={width * 3} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} /></mask>
        <path d={d} stroke={color} strokeWidth={width} fill="none" strokeDasharray={dash} strokeLinecap={cap} mask={`url(#m-${Math.abs(hash(d))})`} />
      </g>
    );
  }
  return <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap={cap} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={opacity} />;
};

export const useSway = (amp: number, speed = 0.6, phase = 0) => {
  const t = useNarrationTime();
  return Math.sin(t * speed + phase) * amp;
};

/** Value that grows 0→1 between two narration times (for growth / reveal). */
export const useGrow = (from: number, to: number) => {
  const t = useNarrationTime();
  return interpolate(t, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
