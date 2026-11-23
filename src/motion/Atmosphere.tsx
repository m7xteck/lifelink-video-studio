import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../brand/tokens";

/**
 * Persistent background: deep tonal gradient, two very slow light pools,
 * vignette and static fine grain. Deliberately quiet — it should never
 * compete with the teaching.
 */
export const Atmosphere: React.FC<{ mood?: number }> = ({ mood = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const ax = 30 + Math.sin(t * 0.05) * 8 + mood * 10;
  const ay = 35 + Math.cos(t * 0.04) * 6;
  const bx = 72 + Math.cos(t * 0.035) * 7;
  const by = 70 + Math.sin(t * 0.045) * 6;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.backgroundDeep} 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 50% at ${ax}% ${ay}%, ${colors.accentSoft}38 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 55% at ${bx}% ${by}%, ${colors.secondary}1c 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, ${colors.backgroundDeep}cc 100%)` }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
