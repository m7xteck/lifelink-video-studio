import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../brand/tokens";
import { PaperGround } from "./brand";

const mix = (a: string, b: string, p: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (n: number, sh: number) => Math.round(((n >> sh) & 255) * (1 - p) + ((pb >> sh) & 255) * p);
  return `rgb(${ch(pa, 16)}, ${ch(pa, 8)}, ${ch(pa, 0)})`;
};

/**
 * The backdrop visible during scene hand-offs. It blends from the outgoing scene's ground colour
 * to the incoming one's, so blue→blue stays blue (no pale flash) and dark→light changes are gradual.
 */
export const GroundBackdrop: React.FC<{ grounds: { startSec: number; endSec: number; color: string }[] }> = ({ grounds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!grounds.length) return null;
  let i = grounds.findIndex((g) => t >= g.startSec && t < g.endSec);
  if (i < 0) i = t < grounds[0].startSec ? 0 : grounds.length - 1;
  const cur = grounds[i];
  const prev = grounds[i - 1];
  const p = prev ? interpolate(t, [cur.startSec, cur.startSec + 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle }) : 1;
  const color = prev ? mix(prev.color, cur.color, p) : mix(cur.color, cur.color, 1);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: color }} />
      <AbsoluteFill style={{ opacity: 0.6 }}><PaperGround color="transparent" seed={2} /></AbsoluteFill>
    </AbsoluteFill>
  );
};
