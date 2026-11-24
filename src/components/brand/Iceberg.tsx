import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Iceberg" — public vs private character.
 *   • the small peak emerges on `peakAt` (what others see); public traits ink in beside it on their cues
 *   • the waterline draws across the frame on `waterlineAt`, the water filling behind the pen
 *   • on `massAt` ("at home") the water clears downward to reveal the far larger hidden mass;
 *     private situations come into focus inside it on their cues
 *   • `focus` 0 = above the water, 1 = below (other half dims); settled frames are still.
 * Geometry is fixed on a 1920×1080 artboard; peak and mass share the waterline edge exactly.
 */
const WL = 432;           // waterline
const PEAK = "M836,432 L896,338 L934,356 L986,250 L1040,322 L1072,302 L1124,432 Z";
const PEAK_FACET = "M986,250 L1040,322 L1072,302 L1124,432 L1012,432 L998,330 Z";
const MASS = "M836,432 L1124,432 L1300,496 L1424,612 L1404,762 L1284,884 L1084,952 L862,942 L662,862 L540,732 L558,580 L680,482 Z";
const MASS_FACET = "M1124,432 L1300,496 L1424,612 L1404,762 L1284,884 L1084,952 L1150,760 L1180,560 Z";
const MASS_BOTTOM = 952;
// public traits: alternate left / right of the peak, two rows
const ABOVE = [
  { x: 770, y: 304, anchor: "end" as const }, { x: 1190, y: 304, anchor: "start" as const },
  { x: 770, y: 392, anchor: "end" as const }, { x: 1190, y: 392, anchor: "start" as const },
];
// private situations: 2×2 inside the mass
const BELOW = [{ x: 790, y: 668 }, { x: 1170, y: 668 }, { x: 790, y: 806 }, { x: 1170, y: 806 }];

/** Script face has a near-zero space: set words as tspans with an explicit gap. */
const scriptWords = (text: string, size: number) => text.split(" ").map((w, i) => <tspan key={i} dx={i ? size * 0.3 : 0}>{w}</tspan>);

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const Iceberg: React.FC<{ scene: SceneOf<"iceberg"> }> = ({ scene }) => {
  const { peakAt, waterlineAt, massAt, above = [], below = [], aboveLabel, belowLabel, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `ib-${scene.id}`;
  const peak = useProgress(peakAt, 1.5, ease.settle);
  const water = useProgress(waterlineAt, 1.6, ease.settle);
  const mass = useProgress(massAt, 2.0, ease.settle);
  const w = focusWeights(2, focus, t);
  const aboveSize = Math.min(40, ...above.slice(0, 4).map((a) => fit(a.text, 40, 500)));
  const belowSize = Math.min(38, ...below.slice(0, 4).map((b) => fit(b.text, 38, 330)));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <clipPath id={`${id}-sky`}><rect x={0} y={0} width={1920} height={WL} /></clipPath>
          <clipPath id={`${id}-mass`}><rect x={0} y={WL} width={1920} height={(MASS_BOTTOM - WL + 20) * mass} /></clipPath>
          <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.sky} />
            <stop offset="1" stopColor={D.hillFar} />
          </linearGradient>
        </defs>

        {/* water body: deepens in as the waterline draws */}
        {water > 0 && (
          <g opacity={water}>
            <rect x={0} y={WL} width={1920} height={1080 - WL} fill={`url(#${id}-depth)`} />
          </g>
        )}

        {/* hidden mass: revealed top-down on "at home" (opacity follows focus) */}
        {mass > 0 && (
          <g clipPath={`url(#${id}-mass)`} opacity={0.35 + 0.65 * w[1]}>
            <path d={MASS} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
            <path d={MASS_FACET} fill={D.skyTint} opacity={0.7} />
          </g>
        )}

        {/* peak: emerges from the waterline */}
        {peak > 0 && (
          <g clipPath={`url(#${id}-sky)`} opacity={Math.min(1, peak * 4) * (0.35 + 0.65 * w[0])}>
            <g transform={`translate(0 ${((1 - peak) * 120).toFixed(2)})`}>
              <path d={PEAK} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
              <path d={PEAK_FACET} fill={D.skyTint} />
            </g>
          </g>
        )}

        {/* waterline: one ink stroke, left → right */}
        {water > 0 && (
          <path d={`M0,${WL} L1920,${WL}`} stroke={D.royalDeep} strokeWidth={3} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - water} />
        )}

        {/* labels */}
        <g opacity={w[0]}>
          {aboveLabel && <ScriptLabel id={`${id}-al`} text={aboveLabel.text} at={aboveLabel.at} x={980} y={196} />}
          {above.slice(0, 4).map((a, i) => <InkText key={i} id={`${id}-a${i}`} text={a.text} at={a.at} size={aboveSize} {...ABOVE[i]} />)}
        </g>
        <g opacity={w[1]}>
          {belowLabel && <ScriptLabel id={`${id}-bl`} text={belowLabel.text} at={Math.max(belowLabel.at, massAt + 0.6)} x={980} y={566} />}
          {below.slice(0, 4).map((b, i) => <FocusText key={i} text={b.text} at={Math.max(b.at, massAt + 0.8)} size={belowSize} {...BELOW[i]} />)}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Text inked left→right (or right→left for end-anchored labels, so the pen moves away from the peak). */
const InkText: React.FC<{ id: string; text: string; at: number; x: number; y: number; size: number; anchor: "start" | "end" }> = ({ id, text, at, x, y, size, anchor }) => {
  const p = useProgress(at, Math.min(1.3, 0.5 + text.length * 0.04), ease.settle);
  if (p <= 0) return null;
  const W = 560;
  const cx = anchor === "start" ? x - 10 : x + 10 - W * p;
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx} y={y - size * 1.2} width={W * p} height={size * 1.7} /></clipPath></defs>
      <text data-qa-text="" x={x} y={y} textAnchor={anchor} fontFamily={fonts.text} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

/** Text that comes into focus in place (no travel): the hidden things surfacing. */
const FocusText: React.FC<{ text: string; at: number; x: number; y: number; size: number }> = ({ text, at, x, y, size }) => {
  const p = useProgress(at, 1.2, ease.settle);
  if (p <= 0) return null;
  return (
    <text data-qa-text="" x={x} y={y} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} opacity={p}
      style={{ filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : undefined }}>{text}</text>
  );
};

const ScriptLabel: React.FC<{ id: string; text: string; at: number; x: number; y: number }> = ({ id, text, at, x, y }) => {
  const p = useProgress(at, Math.min(1.5, 0.6 + text.length * 0.07), ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 76, 420, 0.48);
  return (
    <g>
      <defs><clipPath id={id}><rect x={x - 260} y={y - size * 1.1} width={520 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={x} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{scriptWords(text, size)}</text>
    </g>
  );
};
