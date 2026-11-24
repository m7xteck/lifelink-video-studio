import { interpolate } from "remotion";
import { ease } from "../brand/tokens";

/** `focus` on signature illustrations: one index (static) or timed steps; null = no focus (all full). */
export type Focus = number | { index: number | null; at: number }[] | undefined;

/** Per-part emphasis 0..1 (1 = full, DIM = dimmed) at narration time t; changes ease over 0.7 s. */
export const DIM = 0.35;
export const focusWeights = (n: number, focus: Focus, t: number): number[] => {
  const w = (idx: number | null | undefined, i: number) => (idx == null ? 1 : idx === i ? 1 : DIM);
  if (focus === undefined || typeof focus === "number") return Array.from({ length: n }, (_, i) => w(focus as number | undefined, i));
  const steps = [...focus].sort((a, b) => a.at - b.at);
  return Array.from({ length: n }, (_, i) => {
    let v = 1; // before the first step: no focus
    for (const s of steps) {
      const target = w(s.index, i);
      const p = interpolate(t, [s.at, s.at + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
      v = v + (target - v) * p;
    }
    return v;
  });
};
