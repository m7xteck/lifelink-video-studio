import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, PaperGround } from "../../motion/brand";
import { MaskedWords } from "../../motion/Primitives";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { Ink, PaperDefs, useSway } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * "Finding / Becoming": a compass searches (finding the right partner); then a seedling grows
 * in a pot (becoming the right partner) while the compass recedes. Statement on the left.
 */
export const FindingBecoming: React.FC<{ scene: SceneOf<"findingBecoming"> }> = ({ scene }) => {
  const { kicker, lines, emphasis, findAt, becomeAt } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const id = `fb-${scene.id}`;
  const t = useNarrationTime();
  const compassIn = useProgress(findAt - 0.6, 1.2, ease.settle);
  const recede = interpolate(t, [becomeAt, becomeAt + 1.5], [1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const since = Math.max(0, t - findAt);
  const tremble = useSway(3, 0.9); // always called (hooks must not be conditional)
  const needle = t < findAt ? -24 : -24 + 58 * Math.sin(since * 2.4) * Math.exp(-since * 0.35) + 24 * (1 - Math.exp(-since * 0.5)) + tremble;
  const grow = interpolate(t, [becomeAt, becomeAt + 2.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const potIn = useProgress(becomeAt - 0.8, 1.0, ease.settle);
  const cx = 1640, cy = 300, R = 112; // compass upper-right; plant lower-left of the illustration area (diagonal)
  const px = 1420; // plant sits further right: its leaves reach ~110 px left of px
  // Statement column ends a clear gutter before the plant's leaves; long lines step the type size down to fit
  // (lines are never wrapped: each line is a spoken phrase).
  const textRight = ((px - 110 - 150) / 1920) * L.width;
  const colW = Math.max(L.innerW * 0.45, textRight - L.safeX);
  const longest = Math.max(...lines.map((ln) => ln.text.length));
  const lineSize = L.portrait ? L.size("h2") : Math.round(Math.min(L.size("h2"), colW / (longest * 0.54)));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={71} />
      <svg viewBox="0 0 1920 1080" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        {/* compass: searching */}
        <g opacity={compassIn * recede} transform={`translate(0 ${(1 - compassIn) * 24})`}>
          <Ink d={`M ${cx + 175} ${cy} A 175 175 0 1 1 ${cx + 174} ${cy - 20}`} color={P.royal} width={2.5} at={findAt} dur={2.4} dash="2 12" opacity={0.8} />
          <circle cx={cx} cy={cy} r={R} fill={D.paperLight} stroke={P.oxblood} strokeWidth={5} filter={`url(#${id}-shadow-2)`} />
          <circle cx={cx} cy={cy} r={R - 20} fill="none" stroke={D.hairline} strokeWidth={2} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2, long = i % 6 === 0;
            const r1 = R - 20, r2 = R - (long ? 44 : 32);
            return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} stroke={long ? P.oxblood : D.oxbloodMuted} strokeWidth={long ? 3 : 1.5} />;
          })}
          <g transform={`rotate(${needle} ${cx} ${cy})`} filter={`url(#${id}-shadow-1)`}>
            <path d={`M${cx},${cy - 82} L${cx + 13},${cy} L${cx - 13},${cy} Z`} fill={P.rose} />
            <path d={`M${cx},${cy + 82} L${cx + 13},${cy} L${cx - 13},${cy} Z`} fill={P.oxblood} />
          </g>
          <circle cx={cx} cy={cy} r={9} fill={P.paper} stroke={P.oxblood} strokeWidth={3} />
        </g>
        {/* seedling: becoming */}
        <g opacity={potIn} transform={`translate(0 ${(1 - potIn) * 30})`}>
          <ellipse cx={px} cy={938} rx={120} ry={14} fill="#1a0a0a" opacity={0.12} />
          <path d={`M${px - 92},808 L${px + 92},808 L${px + 68},932 L${px - 68},932 Z`} fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
          <rect x={px - 104} y={786} width={208} height={30} rx={4} fill={D.oxbloodDeep} />
          <ellipse cx={px} cy={790} rx={92} ry={9} fill="#3a2020" />
        </g>
        <Plant cx={px} baseY={790} grow={grow} id={id} />
      </svg>

      <AbsoluteFill style={{ padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
        <div style={{ width: L.portrait ? L.innerW : colW }}>
          {kicker && <div style={{ marginBottom: 30 * L.u, opacity: useProgress(kicker.at, 0.9) }}><BrandLabel size={L.size("label")} color={P.royal}>{kicker.text}</BrandLabel></div>}
          {lines.map((ln, i) => (
            <div key={i} data-qa-text="" style={{ fontFamily: fonts.text, fontSize: lineSize, lineHeight: 1.14, color: P.oxblood, wordSpacing: textStyle.wordSpacing, whiteSpace: "nowrap", marginBottom: i % 2 === 1 ? 26 * L.u : 4 * L.u }}>
              <MaskedWords text={ln.text} at={ln.at} emphasis={emphasis} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Stem grows upward; leaves unfold in turn as the stem passes them; gentle sway once grown. */
const Plant: React.FC<{ cx: number; baseY: number; grow: number; id: string }> = ({ cx, baseY, grow, id }) => {
  const sway = useSway(2.2, 0.7);
  const stem = `M${cx},${baseY} C${cx - 10},${baseY - 80} ${cx + 18},${baseY - 170} ${cx - 6},${baseY - 290}`;
  const leaves = [
    { y: baseY - 70, side: -1, size: 1.0, at: 0.25 }, { y: baseY - 125, side: 1, size: 1.05, at: 0.42 },
    { y: baseY - 185, side: -1, size: 0.9, at: 0.6 }, { y: baseY - 238, side: 1, size: 0.78, at: 0.76 },
    { y: baseY - 288, side: -1, size: 0.55, at: 0.9 }, { y: baseY - 288, side: 1, size: 0.5, at: 0.93 },
  ];
  return (
    <g transform={`rotate(${sway * grow} ${cx} ${baseY})`} filter={`url(#${id}-shadow-1)`}>
      <path d={stem} stroke={D.royalDeep} strokeWidth={8} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
      {leaves.map((lf, i) => {
        const p = Math.max(0, Math.min(1, (grow - lf.at) / 0.18));
        const ease3 = 1 - Math.pow(1 - p, 3);
        const x = cx + (i % 2 ? 6 : -4);
        const len = 92 * lf.size, wid = 34 * lf.size;
        return (
          <g key={i} transform={`translate(${x} ${lf.y}) rotate(${lf.side * (58 - ease3 * 18)}) scale(${ease3})`}>
            <path d={`M0,0 C${wid},${-len * 0.3} ${wid * 0.8},${-len * 0.85} 0,${-len} C${-wid * 0.8},${-len * 0.85} ${-wid},${-len * 0.3} 0,0 Z`} fill={i % 2 ? P.royal : P.sky} />
            <path d={`M0,-4 L0,${-len * 0.86}`} stroke={P.paper} strokeWidth={1.6} opacity={0.6} />
          </g>
        );
      })}
    </g>
  );
};
