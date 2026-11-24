import React from "react";
import { AbsoluteFill } from "remotion";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Three pillars" — a cut-paper temple BUILT as the narrator names its parts.
 *   • the stylobate (three light card steps) is laid on `baseAt` ("three essential pillars")
 *   • each column is assembled on its name: plinth, four drums stacked bottom-up, then the capital —
 *     construction starts a beat before the word so the first drum is landing as the name is spoken;
 *     its script word inks in, the meaning sets beneath on `meaningAt`
 *   • after the third column (`lintelAt`) the entablature lowers onto the capitals and a folded-paper
 *     pediment stands up out of it (clipped: it rises from behind the cornice, never drops in)
 *   • `focus` dims the other columns (revisits / recap); settled frames are still.
 * All geometry on a 1920×1080 artboard; every piece rests on the one below by construction.
 */
const CX = [600, 960, 1320];
const BASE_TOP = 660;                         // top of the upper step = foot of every column
const STEPS = [                               // stylobate: light card steps, each a little wider and darker
  { w: 1000, h: 14, fill: D.paperLight, depth: 1 as const },
  { w: 1060, h: 14, fill: D.hairline, depth: 1 as const },
  { w: 1120, h: 12, fill: D.oxbloodMuted, depth: 2 as const },
];
const PLINTH = { w: 150, h: 22 };
const SHAFT_BOT = BASE_TOP - PLINTH.h, SHAFT_TOP = 362, DRUMS = 4;
const SHAFT_W_BOT = 116, SHAFT_W_TOP = 102;   // gentle entasis-free taper
const ECH = { top: 338, wTop: 150 };          // echinus: flares from shaft top to the abacus
const ABACUS = { y: 312, h: 26, w: 170 };
const ENT = { l: 436, r: 1484, arch: 286, cornice: 270 };  // architrave 286–312, cornice 270–286
const PED = { l: 424, r: 1496, base: 270, apex: 150 };
const WORD_Y = 806, MEAN_Y = 872;

const linear = (x: number) => x;
const fit = (text: string, max: number, maxW: number, em = 0.6) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const ThreePillars: React.FC<{ scene: SceneOf<"threePillars"> }> = ({ scene }) => {
  const { pillars, baseAt, lintelAt, focus, title } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `tp-${scene.id}`;
  const b0 = baseAt ?? scene.startSec;
  const lastAt = Math.max(...pillars.map((p) => p.meaningAt ?? p.at));
  const L0 = lintelAt ?? lastAt + 1;
  const ent = useProgress(L0, 1.1, ease.settle);
  const ped = useProgress(L0 + 0.55, 1.4, ease.settle);
  const entO = useProgress(L0, 0.2, linear), pedO = useProgress(L0 + 0.55, 0.2, linear);
  const w = focusWeights(3, focus, t);
  const titleP = title ? Math.min(1, Math.max(0, (t - title.at) / 1.2)) * (1 - Math.min(1, ent * 2)) : 0;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <PaperTextureDefs id={id} />
          {/* the pediment stands up from behind the cornice */}
          <clipPath id={`${id}-ped`}><rect x={0} y={0} width={1920} height={PED.base + 1} /></clipPath>
        </defs>
        <g transform="translate(960 560) scale(1.08) translate(-960 -540)">
        <g filter={`url(#${id}-tex)`}>
          {/* stylobate: three card steps laid bottom-up on the narrator's "three … pillars" */}
          {STEPS.map((s, i) => <Step key={i} id={id} at={b0 + (STEPS.length - 1 - i) * 0.16} y={BASE_TOP + STEPS.slice(0, i).reduce((a, q) => a + q.h, 0)} {...s} />).reverse()}
          {pillars.slice(0, 3).map((p, i) => <Column key={i} id={id} cx={CX[i]} at={p.at} weight={w[i]} />)}
          {/* folded-paper pediment: two faces meeting at a crease, a lighter tympanum inset */}
          {ped > 0 && (
            <g clipPath={`url(#${id}-ped)`}>
              <g transform={`translate(0 ${((1 - ped) * 124).toFixed(2)})`} opacity={pedO}>
                <g filter={`url(#${id}-shadow-2)`}>
                  <path d={`M${PED.l},${PED.base} L960,${PED.apex} L960,${PED.base} Z`} fill={P.rose} />
                  <path d={`M960,${PED.apex} L${PED.r},${PED.base} L960,${PED.base} Z`} fill={P.rose} />
                </g>
                <path d={`M960,${PED.apex} L${PED.r},${PED.base} L960,${PED.base} Z`} fill={P.oxblood} opacity={0.24} />
                <g filter={`url(#${id}-shadow-1)`}>
                  <path d={`M${PED.l + 150},${PED.base - 8} L960,${PED.apex + 30} L960,${PED.base - 8} Z`} fill={D.paperLight} />
                  <path d={`M960,${PED.apex + 30} L${PED.r - 150},${PED.base - 8} L960,${PED.base - 8} Z`} fill={D.paperShade} />
                </g>
              </g>
            </g>
          )}
          {/* entablature: architrave + fine cornice, lowered onto the capitals */}
          {ent > 0 && (
            <g opacity={entO} transform={`translate(0 ${((1 - ent) * -44).toFixed(2)})`}>
              <rect x={ENT.l} y={ENT.arch} width={ENT.r - ENT.l} height={ABACUS.y - ENT.arch} rx={2} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
              <rect x={ENT.l} y={ABACUS.y - 6} width={ENT.r - ENT.l} height={6} fill={D.paperShade} />
              <rect x={PED.l - 6} y={ENT.cornice} width={PED.r - PED.l + 12} height={ENT.arch - ENT.cornice} rx={2} fill={P.oxblood} filter={`url(#${id}-shadow-1)`} />
            </g>
          )}
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
      <TextureGate />
    </AbsoluteFill>
  );
};

/** One stylobate step: a sheet of card lowered a short way into place. */
const Step: React.FC<{ id: string; at: number; y: number; w: number; h: number; fill: string; depth: 1 | 2 }> = ({ id, at, y, w, h, fill, depth }) => {
  const p = useProgress(at, 1.0, ease.settle);
  const o = useProgress(at, 0.2, linear);
  if (p <= 0) return null;
  return (
    <g opacity={o} transform={`translate(0 ${((1 - p) * -18).toFixed(2)})`}>
      <rect x={960 - w / 2} y={y} width={w} height={h} rx={1.5} fill={fill} filter={`url(#${id}-shadow-${depth})`} />
      <rect x={960 - w / 2} y={y} width={w} height={1.5} fill={D.paperLight} opacity={0.7} />
    </g>
  );
};

/** A piece of a column, lowered `drop` px onto the piece below on its own beat. */
const Piece: React.FC<{ at: number; drop?: number; children: React.ReactNode }> = ({ at, drop = 26, children }) => {
  const p = useProgress(at, 0.62, ease.enter);
  const o = useProgress(at, 0.1, linear); // card is opaque almost at once; only its position eases
  if (p <= 0) return null;
  return <g opacity={o} transform={`translate(0 ${((1 - p) * -drop).toFixed(2)})`}>{children}</g>;
};

/** A column assembled from plinth, drums and capital — it is built, not faded in. */
const Column: React.FC<{ id: string; cx: number; at: number; weight: number }> = ({ id, cx, at, weight }) => {
  const s0 = at - 0.15;                 // the plinth is down as the name begins; drums land while it is spoken
  const foot = useProgress(s0, 0.62, ease.settle);
  if (foot <= 0) return null;
  const drumH = (SHAFT_BOT - SHAFT_TOP) / DRUMS;
  const halfW = (y: number) => (SHAFT_W_BOT + (SHAFT_W_TOP - SHAFT_W_BOT) * ((SHAFT_BOT - y) / (SHAFT_BOT - SHAFT_TOP))) / 2;
  const sh = `url(#${id}-shadow-1)`;
  return (
    <g opacity={weight}>
      {/* contact shadow on the step: the column's weight arriving */}
      <ellipse cx={cx} cy={BASE_TOP + 2} rx={92} ry={5} fill="#1a0a0a" opacity={0.14 * foot} />
      <Piece at={s0}>
        <rect x={cx - PLINTH.w / 2} y={SHAFT_BOT} width={PLINTH.w} height={PLINTH.h} rx={2} fill={D.royalDeep} filter={sh} />
        <rect x={cx - PLINTH.w / 2} y={SHAFT_BOT} width={PLINTH.w} height={2} fill={P.sky} opacity={0.35} />
      </Piece>
      {Array.from({ length: DRUMS }, (_, k) => {
        const yb = SHAFT_BOT - k * drumH, yt = yb - drumH;
        const wb = halfW(yb), wt = halfW(yt);
        const face = `M${cx - wb},${yb} L${cx - wt},${yt} L${cx + wt},${yt} L${cx + wb},${yb} Z`;
        // right third of each drum in shade: the fold of a paper prism catching side light
        const shade = `M${cx + wb * 0.34},${yb} L${cx + wt * 0.34},${yt} L${cx + wt},${yt} L${cx + wb},${yb} Z`;
        return (
          <Piece key={k} at={s0 + 0.24 + k * 0.2}>
            <path d={face} fill={P.royal} filter={sh} />
            <path d={shade} fill={D.royalDeep} opacity={0.42} />
            <path d={`M${cx - wb + 8},${yb - 4} L${cx - wt + 8},${yt + 4}`} stroke={P.sky} strokeWidth={3} opacity={0.4} strokeLinecap="round" />
            <rect x={cx - wt} y={yt} width={wt * 2} height={2} fill={D.royalDeep} opacity={0.55} />
          </Piece>
        );
      })}
      <Piece at={s0 + 0.24 + DRUMS * 0.2}>
        <path d={`M${cx - SHAFT_W_TOP / 2},${SHAFT_TOP} L${cx - ECH.wTop / 2},${ECH.top} L${cx + ECH.wTop / 2},${ECH.top} L${cx + SHAFT_W_TOP / 2},${SHAFT_TOP} Z`} fill={P.royal} filter={sh} />
        <path d={`M${cx + SHAFT_W_TOP * 0.17},${SHAFT_TOP} L${cx + ECH.wTop * 0.17},${ECH.top} L${cx + ECH.wTop / 2},${ECH.top} L${cx + SHAFT_W_TOP / 2},${SHAFT_TOP} Z`} fill={D.royalDeep} opacity={0.42} />
      </Piece>
      <Piece at={s0 + 0.24 + DRUMS * 0.2 + 0.18}>
        <rect x={cx - ABACUS.w / 2} y={ABACUS.y} width={ABACUS.w} height={ABACUS.h} rx={2} fill={D.royalDeep} filter={sh} />
        <rect x={cx - ABACUS.w / 2} y={ABACUS.y} width={ABACUS.w} height={2} fill={P.sky} opacity={0.35} />
      </Piece>
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
