import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";
import { PaperTextureDefs, TextureGate } from "./paperTexture";

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
 * Colour carries meaning: care/responsibility = royal, trust = sky, and only a side headed "control" is rose.
 * Cut-paper construction: tapered beam with a lower fold, light card plates for the base, shallow paper trays;
 * paper grain on every shape. The beam angle follows the landed weight with one long soft settle (no swing).
 */
const CX = 960, PIVOT_Y = 600, HALF = 450, STEM = 34, PAN_W = 360, PAN_H = 22;
const BLOCK_H = 50, BLOCK_GAP = 8, MAX_DEG = 7, DEG_PER = 1.6;
const BASE_Y = 852;
const linear = (x: number) => x;
/** Block colours by meaning (label decides): control → rose; trust/care → sky on the right, royal on the left. */
const tone = (label: string, side: "left" | "right") =>
  /control/i.test(label) ? { fill: P.rose, ink: D.paperLight } : side === "left" ? { fill: P.royal, ink: D.paperLight } : { fill: P.sky, ink: D.royalDeep };

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
  const lvl = useProgress(levelAt ?? 1e9, 1.8, ease.settle);

  // each block's weight lands with its drop; released blocks stop weighing as they lift away
  const land = (at: number) => interpolate(t, [at, at + 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const wL = left.items.reduce((s, it) => s + land(it.at), 0) * (1 - relL);
  const wR = right.items.reduce((s, it) => s + land(it.at), 0) * (1 - relR);
  const deg = Math.max(-MAX_DEG, Math.min(MAX_DEG, (wR - wL) * DEG_PER)) * (1 - lvl);
  const rad = (deg * Math.PI) / 180;
  const end = (s: -1 | 1) => ({ x: CX + s * HALF * Math.cos(rad), y: PIVOT_Y + s * HALF * Math.sin(rad) });
  const fw = (s: "left" | "right") => {
    if (!focus) return 1;
    return focus === s ? 1 : 0.35;
  };
  const so = useProgress(beamAt ?? scene.startSec, 0.25, linear);

  // one block text size for both pans (consistent type)
  const size = Math.min(...[...left.items, ...right.items].map((it) => fit(it.text, 30, PAN_W - 56, 0.55)), 30);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <PaperTextureDefs id={id} />
        <g filter={`url(#${id}-tex)`}>
        {/* stand: two light card plates + a tapered post folded down its right side */}
        <g opacity={so} transform={`translate(0 ${((1 - stand) * 20).toFixed(2)})`}>
          <rect x={CX - 200} y={BASE_Y + 14} width={400} height={14} rx={2} fill={D.hairline} filter={`url(#${id}-shadow-2)`} />
          <rect x={CX - 150} y={BASE_Y} width={300} height={14} rx={2} fill={D.paperLight} filter={`url(#${id}-shadow-1)`} />
          <path d={`M${CX - 20},${BASE_Y} L${CX - 9},${PIVOT_Y} L${CX + 9},${PIVOT_Y} L${CX + 20},${BASE_Y} Z`} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
          <path d={`M${CX},${BASE_Y} L${CX},${PIVOT_Y} L${CX + 9},${PIVOT_Y} L${CX + 20},${BASE_Y} Z`} fill={D.oxbloodDeep} opacity={0.6} />
        </g>
        {/* beam: tapered paper strip (deep at the pivot, fine at the ends) with a darker lower fold */}
        <g opacity={so} transform={`rotate(${deg.toFixed(3)} ${CX} ${PIVOT_Y})`}>
          <path d={`M${CX - HALF - 12},${PIVOT_Y - 4} L${CX},${PIVOT_Y - 11} L${CX + HALF + 12},${PIVOT_Y - 4} L${CX + HALF + 12},${PIVOT_Y + 4} L${CX},${PIVOT_Y + 11} L${CX - HALF - 12},${PIVOT_Y + 4} Z`}
            fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
          <path d={`M${CX - HALF - 12},${PIVOT_Y} L${CX + HALF + 12},${PIVOT_Y} L${CX + HALF + 12},${PIVOT_Y + 4} L${CX},${PIVOT_Y + 11} L${CX - HALF - 12},${PIVOT_Y + 4} Z`} fill={D.oxbloodDeep} opacity={0.7} />
        </g>
        <circle cx={CX} cy={PIVOT_Y} r={17} fill={D.oxbloodDeep} opacity={so} filter={`url(#${id}-shadow-1)`} />
        <circle cx={CX} cy={PIVOT_Y} r={5} fill={D.paperLight} opacity={so} />
        {/* pans stay horizontal and ride on the beam ends */}
        {([[-1, left, "left", relL], [1, right, "right", relR]] as const).map(([s, side, key, rel]) => {
          const e = end(s);
          const tn = tone((side as Side).label, key);
          const top = e.y - STEM - PAN_H;
          return (
            <g key={key} opacity={so * fw(key)}>
              <rect x={e.x - 4} y={e.y - STEM} width={8} height={STEM} fill={D.oxbloodDeep} />
              <path d={`M${e.x - PAN_W / 2},${top} L${e.x + PAN_W / 2},${top} L${e.x + PAN_W / 2 - 30},${e.y - STEM} L${e.x - PAN_W / 2 + 30},${e.y - STEM} Z`}
                fill={D.paperShade} filter={`url(#${id}-shadow-2)`} />
              <rect x={e.x - PAN_W / 2 - 4} y={top - 4} width={PAN_W + 8} height={6} rx={2} fill={D.paperLight} filter={`url(#${id}-shadow-1)`} />
              {(side as Side).items.slice(0, 5).map((it, k) => (
                <Block key={k} id={id} at={it.at} text={it.text} x={e.x} y={top - 4 - (k + 1) * BLOCK_H - k * BLOCK_GAP} fill={tn.fill} ink={tn.ink} size={size} rel={rel} k={k} />
              ))}
            </g>
          );
        })}
        </g>
      </svg>
      {/* pan headings: fixed under each side, clear of the beam's travel */}
      {([[-1, left, "left"], [1, right, "right"]] as const).map(([s, side, key]) => (
        <Heading key={key} text={(side as Side).label} at={(side as Side).at} x={CX + s * HALF} opacity={fw(key)} u={L.width / 1920} />
      ))}
      {pivot && <PivotWord text={pivot.text} at={pivot.at} u={L.width / 1920} />}
      <TextureGate />
    </AbsoluteFill>
  );
};

/** A labelled paper block that drops into the pan on its cue; when released it lifts away and fades. */
const Block: React.FC<{ id: string; at: number; text: string; x: number; y: number; fill: string; ink: string; size: number; rel: number; k: number }> = ({ id, at, text, x, y, fill, ink, size, rel, k }) => {
  const p = useProgress(at, 0.8, ease.settle);
  const appear = useProgress(at, 0.14, linear); // opaque card at once; only the drop eases
  if (p <= 0) return null;
  const w = Math.min(PAN_W - 24, Math.max(150, text.length * size * 0.56 + 52)) - (k % 2) * 10;
  const lift = rel * (90 + k * 14);
  const o = appear * (1 - rel);
  if (o <= 0.001) return null;
  return (
    <g opacity={o} transform={`translate(0 ${((1 - p) * -70 - lift).toFixed(2)})`}>
      <rect x={x - w / 2} y={y} width={w} height={BLOCK_H} rx={3} fill={fill} filter={`url(#${id}-shadow-1)`} />
      <rect x={x - w / 2 + 4} y={y + 3} width={w - 8} height={2} fill={D.paperLight} opacity={0.3} />
      <rect x={x - w / 2} y={y + BLOCK_H - 5} width={w} height={5} rx={2} fill="#1a0a0a" opacity={0.1} />
      <text data-qa-text="" x={x} y={y + BLOCK_H / 2 + size * 0.36} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={ink}>{text}</text>
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
