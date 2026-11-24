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
 * Signature: "Three pillars" — a small cut-paper temple built as the narrator names its parts.
 *   • base (stylobate) lays on `baseAt` ("three essential pillars")
 *   • each column rises from the base on its name; its script word inks in, the meaning sets beneath on `meaningAt`
 *   • the lintel + roof land only after the third column ("lintelAt")
 *   • `focus` dims the other columns (revisits / recap); settled frames are still.
 * All geometry on a 1920×1080 artboard; columns stand exactly on the top step by construction.
 */
const CX = [600, 960, 1320];
const BASE_TOP = 660;          // top of the upper step = foot of every column
const COL_TOP = 312;           // underside of the lintel = top of every capital
const SHAFT_W = 118, CAP_W = 172, CAP_H = 26, PLINTH_W = 156, PLINTH_H = 22;
const LINTEL = { x: 432, y: 268, w: 1056, h: COL_TOP - 268 };
const ROOF = { l: 404, r: 1516, base: 268, apex: 160 };
const WORD_Y = 806, MEAN_Y = 872;

const fit = (text: string, max: number, maxW: number, em = 0.6) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const ThreePillars: React.FC<{ scene: SceneOf<"threePillars"> }> = ({ scene }) => {
  const { pillars, baseAt, lintelAt, focus, title } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `tp-${scene.id}`;
  const base = useProgress(baseAt ?? scene.startSec, 1.2, ease.settle);
  const lastAt = Math.max(...pillars.map((p) => p.meaningAt ?? p.at));
  const lintel = useProgress(lintelAt ?? lastAt + 1, 1.4, ease.settle);
  const w = focusWeights(3, focus, t);
  const titleP = title ? Math.min(1, Math.max(0, (t - title.at) / 1.2)) * (1 - Math.min(1, lintel * 2)) : 0;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <g transform="translate(960 560) scale(1.08) translate(-960 -540)">
        {/* base: two cut-paper steps */}
        <g opacity={Math.min(1, base * 4)} transform={`translate(0 ${((1 - base) * 24).toFixed(2)})`}>
          <rect x={390} y={BASE_TOP + 28} width={1140} height={30} rx={2} fill={D.oxbloodDeep} filter={`url(#${id}-shadow-2)`} />
          <rect x={420} y={BASE_TOP} width={1080} height={30} rx={2} fill={P.oxblood} filter={`url(#${id}-shadow-1)`} />
        </g>
        {pillars.slice(0, 3).map((p, i) => <Column key={i} id={id} cx={CX[i]} at={p.at} weight={w[i]} />)}
        {/* lintel + roof land together after the third column */}
        <g opacity={Math.min(1, lintel * 4)} transform={`translate(0 ${((1 - lintel) * -60).toFixed(2)})`}>
          <path d={`M${ROOF.l},${ROOF.base} L960,${ROOF.apex} L${ROOF.r},${ROOF.base} Z`} fill={P.rose} filter={`url(#${id}-shadow-2)`} />
          <path d={`M${ROOF.l + 120},${ROOF.base - 10} L960,${ROOF.apex + 34} L${ROOF.r - 120},${ROOF.base - 10} Z`} fill={D.paperShade} />
          <rect x={LINTEL.x} y={LINTEL.y} width={LINTEL.w} height={LINTEL.h} rx={2} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
        </g>
        {pillars.slice(0, 3).map((p, i) => (
          <g key={i} opacity={w[i]}>
            <ScriptWord id={`${id}-w${i}`} text={p.word} at={p.at + 0.15} cx={CX[i]} />
            {p.meaning && <Meaning text={p.meaning} at={p.meaningAt ?? p.at + 0.8} cx={CX[i]} />}
          </g>
        ))}
        </g>
        {title && titleP > 0 && (
          <text data-qa-text="" x={150} y={170} fontFamily={fonts.text} fontSize={58} fill={P.oxblood} opacity={titleP}
            style={{ filter: titleP < 1 ? `blur(${((1 - titleP) * 7).toFixed(2)}px)` : undefined }}>{title.text}</text>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/** A column that rises out of the base (revealed bottom-up) — it is "raised", not dropped in. */
const Column: React.FC<{ id: string; cx: number; at: number; weight: number }> = ({ id, cx, at, weight }) => {
  const p = useProgress(at, 1.4, ease.settle);
  if (p <= 0) return null;
  const h = (BASE_TOP - COL_TOP) * p;
  const clip = `${id}-c${cx}`;
  const shaftTop = COL_TOP + CAP_H, shaftBot = BASE_TOP - PLINTH_H;
  return (
    <g opacity={Math.min(1, p * 5) * weight}>
      <defs><clipPath id={clip}><rect x={cx - CAP_W} y={BASE_TOP - h} width={CAP_W * 2} height={h + 1} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <g filter={`url(#${id}-shadow-2)`}>
          <rect x={cx - SHAFT_W / 2} y={shaftTop} width={SHAFT_W} height={shaftBot - shaftTop} fill={P.royal} />
          <rect x={cx - CAP_W / 2} y={COL_TOP} width={CAP_W} height={CAP_H} rx={2} fill={D.royalDeep} />
          <rect x={cx - PLINTH_W / 2} y={shaftBot} width={PLINTH_W} height={PLINTH_H} rx={2} fill={D.royalDeep} />
        </g>
        {[-30, 0, 30].map((dx) => <line key={dx} x1={cx + dx} x2={cx + dx} y1={shaftTop + 14} y2={shaftBot - 14} stroke={P.sky} strokeWidth={3} opacity={0.45} />)}
      </g>
    </g>
  );
};

/** Script word inked left→right under its column. */
const ScriptWord: React.FC<{ id: string; text: string; at: number; cx: number }> = ({ id, text, at, cx }) => {
  const dur = Math.min(1.6, 0.6 + text.length * 0.07);
  const p = useProgress(at, dur, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 84, 330, 0.5);
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx - 200} y={WORD_Y - size * 1.1} width={400 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={cx} y={WORD_Y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

const Meaning: React.FC<{ text: string; at: number; cx: number }> = ({ text, at, cx }) => {
  const p = useProgress(at, 1.1, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 34, 320);
  return (
    <text data-qa-text="" x={cx} y={MEAN_Y + (1 - p) * 10} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.oxbloodMuted} opacity={p}>
      {text}
    </text>
  );
};
