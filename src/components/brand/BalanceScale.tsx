import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Balance" — responsibility (care) weighed against control, settling on trust (amanah).
 *   • the stand and beam are cut on `beamAt`; each pan's heading sets on its side's `at`
 *   • every spoken example is a paper block that drops (70 px) into its pan on its cue; the beam tips toward
 *     the heavier side as the weight lands (eased, never swinging)
 *   • `release` lifts one side's blocks away on its cue (e.g. "abuse is not … responsibility")
 *   • `levelAt` brings the beam to rest level; `pivot` inks a script word under the stand (e.g. "amanah")
 *   • `focus` ("left" | "right") dims the other side for revisits. Settled frames are still.
 * Pans ride on short stems above the beam ends (top-pan balance) so stacked blocks never touch a hanger.
 */
const CX = 960, PIVOT_Y = 600, HALF = 450, STEM = 34, PAN_W = 360, PAN_H = 22;
const BLOCK_H = 50, BLOCK_GAP = 8, MAX_DEG = 7, DEG_PER = 1.6;
const BASE_Y = 852;

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

type Item = { text: string; at: number };
type Side = { label: string; at: number; items: Item[] };

export const BalanceScale: React.FC<{ scene: SceneOf<"balanceScale"> }> = ({ scene }) => {
  const { left, right, beamAt, release, levelAt, pivot, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `bs-${scene.id}`;
  const stand = useProgress(beamAt ?? scene.startSec, 1.2, ease.settle);
  const relP = useProgress(release?.at ?? 1e9, 1.2, ease.settle);
  const relL = release?.side === "left" ? relP : 0, relR = release?.side === "right" ? relP : 0;
  const lvl = useProgress(levelAt ?? 1e9, 1.6, ease.settle);

  // each block's weight lands with its drop; released blocks stop weighing as they lift away
  const land = (at: number) => interpolate(t, [at, at + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const wL = left.items.reduce((s, it) => s + land(it.at), 0) * (1 - relL);
  const wR = right.items.reduce((s, it) => s + land(it.at), 0) * (1 - relR);
  const deg = Math.max(-MAX_DEG, Math.min(MAX_DEG, (wR - wL) * DEG_PER)) * (1 - lvl);
  const rad = (deg * Math.PI) / 180;
  const end = (s: -1 | 1) => ({ x: CX + s * HALF * Math.cos(rad), y: PIVOT_Y + s * HALF * Math.sin(rad) });
  const fw = (s: "left" | "right") => {
    if (!focus) return 1;
    return focus === s ? 1 : 0.35;
  };
  const so = Math.min(1, stand * 4);

  // one block text size for both pans (consistent type)
  const size = Math.min(...[...left.items, ...right.items].map((it) => fit(it.text, 30, PAN_W - 56, 0.55)), 30);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        {/* stand: base + post */}
        <g opacity={so} transform={`translate(0 ${((1 - stand) * 24).toFixed(2)})`}>
          <rect x={CX - 170} y={BASE_Y} width={340} height={28} rx={3} fill={D.oxbloodDeep} filter={`url(#${id}-shadow-2)`} />
          <path d={`M${CX - 22},${BASE_Y} L${CX - 12},${PIVOT_Y} L${CX + 12},${PIVOT_Y} L${CX + 22},${BASE_Y} Z`} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
        </g>
        {/* beam (rotates about the pivot) */}
        <g opacity={so} transform={`rotate(${deg.toFixed(3)} ${CX} ${PIVOT_Y})`}>
          <rect x={CX - HALF - 14} y={PIVOT_Y - 9} width={(HALF + 14) * 2} height={18} rx={9} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
        </g>
        <circle cx={CX} cy={PIVOT_Y} r={24} fill={P.rose} opacity={so} filter={`url(#${id}-shadow-1)`} />
        <circle cx={CX} cy={PIVOT_Y} r={7} fill={D.paperLight} opacity={so} />
        {/* pans stay horizontal and ride on the beam ends */}
        {([[-1, left, "left", P.royal, relL], [1, right, "right", P.rose, relR]] as const).map(([s, side, key, fill, rel]) => {
          const e = end(s);
          return (
            <g key={key} opacity={so * fw(key)}>
              <rect x={e.x - 6} y={e.y - STEM} width={12} height={STEM} fill={D.oxbloodDeep} />
              <path d={`M${e.x - PAN_W / 2},${e.y - STEM - PAN_H} L${e.x + PAN_W / 2},${e.y - STEM - PAN_H} L${e.x + PAN_W / 2 - 26},${e.y - STEM} L${e.x - PAN_W / 2 + 26},${e.y - STEM} Z`}
                fill={D.paperShade} stroke={P.oxblood} strokeWidth={2} filter={`url(#${id}-shadow-1)`} />
              {(side as Side).items.slice(0, 5).map((it, k) => (
                <Block key={k} id={id} at={it.at} text={it.text} x={e.x} y={e.y - STEM - PAN_H - (k + 1) * BLOCK_H - k * BLOCK_GAP} fill={fill} size={size} rel={rel} k={k} />
              ))}
            </g>
          );
        })}
      </svg>
      {/* pan headings: fixed under each side, clear of the beam's travel */}
      {([[-1, left, "left"], [1, right, "right"]] as const).map(([s, side, key]) => (
        <Heading key={key} text={(side as Side).label} at={(side as Side).at} x={CX + s * HALF} opacity={fw(key)} u={L.width / 1920} />
      ))}
      {pivot && <PivotWord text={pivot.text} at={pivot.at} u={L.width / 1920} />}
    </AbsoluteFill>
  );
};

/** A labelled paper block that drops into the pan on its cue; when released it lifts away and fades. */
const Block: React.FC<{ id: string; at: number; text: string; x: number; y: number; fill: string; size: number; rel: number; k: number }> = ({ id, at, text, x, y, fill, size, rel, k }) => {
  const p = useProgress(at, 0.7, ease.settle);
  if (p <= 0) return null;
  const w = Math.min(PAN_W - 24, Math.max(150, text.length * size * 0.56 + 52)) - (k % 2) * 10;
  const lift = rel * (90 + k * 14);
  const o = Math.min(1, p * 4) * (1 - rel);
  if (o <= 0.001) return null;
  return (
    <g opacity={o} transform={`translate(0 ${((1 - p) * -70 - lift).toFixed(2)})`}>
      <rect x={x - w / 2} y={y} width={w} height={BLOCK_H} rx={3} fill={fill} filter={`url(#${id}-shadow-1)`} />
      <text data-qa-text="" x={x} y={y + BLOCK_H / 2 + size * 0.36} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.paperLight}>{text}</text>
    </g>
  );
};

const Heading: React.FC<{ text: string; at: number; x: number; opacity: number; u: number }> = ({ text, at, x, opacity, u }) => {
  const p = useProgress(at, 1.0, ease.settle);
  // written left→right (ink), no rise
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge + 3}%)`;
  return (
    <div style={{ position: "absolute", left: (x - 280) * u, width: 560 * u, top: 712 * u, textAlign: "center", opacity: (p > 0 ? 1 : 0) * opacity, WebkitMaskImage: mask, maskImage: mask }}>
      <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: fit(text, 48, 520, 0.56) * u, color: P.oxblood }}>{text}</span>
    </div>
  );
};

const PivotWord: React.FC<{ text: string; at: number; u: number }> = ({ text, at, u }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge + 3}%)`;
  return (
    <div style={{ position: "absolute", left: 0, width: "100%", top: 884 * u, textAlign: "center" }}>
      <span data-qa-text="" style={{ display: "inline-block", fontFamily: fonts.script, fontSize: 78 * u, color: P.oxblood, lineHeight: 1.25, padding: "0.05em 0.2em 0.15em",
        opacity: p > 0 ? 1 : 0, WebkitMaskImage: mask, maskImage: mask }}>{text}</span>
    </div>
  );
};
