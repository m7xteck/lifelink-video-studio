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
 * Signature: "Pressures & shelter" — a marriage in a changing world.
 *   • a small paper house is set on its foundation slab on `houseAt`
 *   • each pressure arrives as a labelled wind stroke drawn from the frame edge toward the house on its cue
 *     (alternating left / right, three rows a side); the house stays standing
 *   • the slab's values ink in on their cues; on `foundationAt` the slab glows and the pressures recede
 *   • `focus` (pressure index) dims the other pressures for revisits; settled frames are still.
 * Fixed 1920×1080 artboard: house walls sit exactly on the slab top.
 */
const SLAB = { x: 400, y: 716, w: 1120, h: 78 };
const WALL = { l: 806, r: 1114, top: 486 };
const ROOF = { l: 768, r: 1152, base: 494, apex: 334 };
const ROWS = [404, 528, 652];
const LEFT = { from: 120, to: 724 }, RIGHT = { from: 1800, to: 1196 };

/** Script face has a near-zero space: set words as tspans with an explicit gap. */
const scriptWords = (text: string, size: number) => text.split(" ").map((w, i) => <tspan key={i} dx={i ? size * 0.3 : 0}>{w}</tspan>);

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const PressuresShelter: React.FC<{ scene: SceneOf<"pressuresShelter"> }> = ({ scene }) => {
  const { houseAt, pressures, values = [], foundationAt, caption, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `ps-${scene.id}`;
  const house = useProgress(houseAt, 1.4, ease.settle);
  const slab = useProgress(houseAt - 0.2, 1.2, ease.settle);
  const glowP = useProgress(foundationAt ?? 1e9, 1.6, ease.settle);
  const glow = foundationAt != null ? glowP : 0;
  const n = Math.min(6, pressures.length);
  const w = focusWeights(n, focus, t);
  const labelSize = Math.min(38, ...pressures.slice(0, 6).map((p) => fit(p.text, 38, 560)));
  const vals = values.slice(0, 4);
  const cellW = SLAB.w / Math.max(1, vals.length);
  const valSize = Math.min(30, ...vals.map((v) => fit(v.text, 30, cellW - 36, 0.55)));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <g transform="translate(0 70)">
        <defs>
          <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x="200" y="560" width="1520" height="400"><feGaussianBlur stdDeviation="26" /></filter>
        </defs>

        {/* pressures: wind strokes from the edges (recede once the foundation is named) */}
        <g opacity={1 - glow * 0.45}>
          {pressures.slice(0, 6).map((p, i) => <Wind key={i} id={`${id}-p${i}`} text={p.text} at={p.at} i={i} size={labelSize} weight={w[i]} />)}
        </g>

        {/* foundation glow */}
        {glow > 0 && <rect x={SLAB.x - 10} y={SLAB.y - 6} width={SLAB.w + 20} height={SLAB.h + 12} rx={10} fill={P.sky} opacity={glow * 0.85} filter={`url(#${id}-glow)`} />}

        {/* slab */}
        <g opacity={Math.min(1, slab * 4)} transform={`translate(0 ${((1 - slab) * 24).toFixed(2)})`}>
          <rect x={SLAB.x} y={SLAB.y} width={SLAB.w} height={SLAB.h} rx={3} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
          <rect x={SLAB.x} y={SLAB.y} width={SLAB.w} height={SLAB.h} rx={3} fill={P.royal} opacity={glow} />
          {vals.slice(1).map((_, i) => (
            <line key={i} x1={SLAB.x + cellW * (i + 1)} x2={SLAB.x + cellW * (i + 1)} y1={SLAB.y + 16} y2={SLAB.y + SLAB.h - 16} stroke={D.paperLight} strokeWidth={1.5} opacity={0.35 * Math.min(1, Math.max(0, (t - vals[i + 1].at) * 2))} />
          ))}
        </g>
        {vals.map((v, i) => <InkValue key={i} id={`${id}-v${i}`} text={v.text} at={v.at} cx={SLAB.x + cellW * (i + 0.5)} size={valSize} />)}

        {/* house: rises onto the slab */}
        {house > 0 && (
          <g opacity={Math.min(1, house * 4)} transform={`translate(0 ${((1 - house) * 40).toFixed(2)})`}>
            <rect x={WALL.l} y={WALL.top} width={WALL.r - WALL.l} height={SLAB.y - WALL.top} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
            <rect x={WALL.l + (WALL.r - WALL.l) * 0.62} y={WALL.top} width={(WALL.r - WALL.l) * 0.38} height={SLAB.y - WALL.top} fill={D.paperShade} />
            {/* door + window: cut-outs */}
            <path d={`M928,${SLAB.y} L928,610 Q960,582 992,610 L992,${SLAB.y} Z`} fill={P.royal} />
            <rect x={840} y={540} width={58} height={58} rx={3} fill={P.sky} />
            <rect x={1024} y={540} width={58} height={58} rx={3} fill={P.sky} />
            <path d={`M${ROOF.l},${ROOF.base} L960,${ROOF.apex} L${ROOF.r},${ROOF.base} Z`} fill={P.rose} filter={`url(#${id}-shadow-2)`} />
            <path d={`M960,${ROOF.apex} L${ROOF.r},${ROOF.base} L1060,${ROOF.base} Z`} fill={P.oxblood} opacity={0.28} />
          </g>
        )}

        </g>
        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} />}
      </svg>
    </AbsoluteFill>
  );
};

/** One pressure: three wind strands drawn from the frame edge toward the house, label inked above. */
const Wind: React.FC<{ id: string; text: string; at: number; i: number; size: number; weight: number }> = ({ id, text, at, i, size, weight }) => {
  const left = i % 2 === 0;
  const y = ROWS[Math.floor(i / 2) % 3];
  const { from, to } = left ? LEFT : RIGHT;
  const dir = left ? 1 : -1;
  const p = useProgress(at, 1.3, ease.settle);
  const lp = useProgress(at + 0.15, Math.min(1.2, 0.5 + text.length * 0.04), ease.settle);
  if (p <= 0) return null;
  const strand = (dy: number, inset: number, len: number) => {
    const a = from + dir * inset, b = from + dir * (inset + (Math.abs(to - from) - inset) * len);
    const m = (a + b) / 2;
    return `M${a},${y + dy} C${m},${y + dy - 16} ${m},${y + dy + 16} ${b},${y + dy}`;
  };
  const strands: [number, number, number, number, number][] = [[0, 0, 1, 3.5, 1], [-18, 60, 0.82, 2.5, 0.75], [18, 120, 0.7, 2.5, 0.75]];
  const W = 600;
  const clipX = left ? from - 10 : from + 10 - W * lp;
  return (
    <g opacity={weight}>
      {strands.map(([dy, inset, len, sw, op], k) => (
        <path key={k} d={strand(dy, inset, len)} stroke={P.rose} strokeWidth={sw} fill="none" strokeLinecap="round" opacity={op}
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      ))}
      <defs><clipPath id={id}><rect x={clipX} y={y - 40 - size * 1.2} width={W * lp} height={size * 1.7} /></clipPath></defs>
      <text data-qa-text="" x={from} y={y - 40} textAnchor={left ? "start" : "end"} fontFamily={fonts.text} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

const InkValue: React.FC<{ id: string; text: string; at: number; cx: number; size: number }> = ({ id, text, at, cx, size }) => {
  const p = useProgress(at, Math.min(1.1, 0.5 + text.length * 0.04), ease.settle);
  if (p <= 0) return null;
  const W = text.length * size * 0.6 + 40;
  const y = SLAB.y + SLAB.h / 2 + size * 0.36;
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx - W / 2} y={y - size * 1.2} width={W * p} height={size * 1.7} /></clipPath></defs>
      <text data-qa-text="" x={cx} y={y} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.paperLight} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

const CaptionScript: React.FC<{ id: string; text: string; at: number }> = ({ id, text, at }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 76, 900, 0.48);
  return (
    <g>
      <defs><clipPath id={id}><rect x={960 - 520} y={984 - size * 1.1} width={1040 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={960} y={984} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{scriptWords(text, size)}</text>
    </g>
  );
};
