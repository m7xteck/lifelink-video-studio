import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { Layer, PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * "The First Step": paper-cut landscape. Layered hills (with gentle parallax), a paper path
 * winding to a rising sun, and stepping stones that appear one by one, the first one lighting up
 * exactly when "first step" is spoken.
 */
export const PathLandscape: React.FC<{ scene: SceneOf<"pathLandscape"> }> = ({ scene }) => {
  const { lines, script, firstStepAt } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const s0 = scene.startSec;
  const id = `pl-${scene.id}`;
  const sunY = interpolate(t, [s0, scene.endSec], [650, 585], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const pathReveal = useProgress(s0 + 0.6, 2.6, ease.settle);
  const stones = [
    { x: 962, y: 1028, rx: 50, ry: 17 }, { x: 990, y: 948, rx: 42, ry: 14 }, { x: 1046, y: 868, rx: 34, ry: 11 },
    { x: 1138, y: 795, rx: 27, ry: 9 }, { x: 1238, y: 722, rx: 20, ry: 7 }, { x: 1296, y: 662, rx: 13, ry: 5 },
  ];

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.royalDeep} />
            <stop offset="45%" stopColor={P.royal} />
            <stop offset="62%" stopColor={D.skyTint} />
          </linearGradient>
          {/* feathered reveal: the path unrolls with a soft leading edge, not a hard line */}
          <linearGradient id={`${id}-feather`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id={`${id}-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <rect x="0" y={1080 - pathReveal * 600} width="1920" height="90" fill={`url(#${id}-feather)`} />
            <rect x="0" y={1080 - pathReveal * 600 + 90} width="1920" height="1080" fill="#fff" />
          </mask>
          <radialGradient id={`${id}-glow`}><stop offset="0%" stopColor={P.paper} stopOpacity="0.9" /><stop offset="100%" stopColor={P.paper} stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1920" height="1080" fill={`url(#${id}-sky)`} />
        {/* sun: a full disc rising behind the hills, with a soft halo */}
        <circle cx="1330" cy={sunY} r="260" fill={`url(#${id}-glow)`} opacity={0.35} />
        <circle cx="1330" cy={sunY} r="112" fill={P.paper} opacity={0.96} />
        <Layer id={id} at={s0 + 0.1} depth={1} rise={20} drift={-1.5} fill={D.hillFar}
          d="M-200,640 C300,560 520,600 760,590 C1000,580 1200,520 1500,560 C1700,585 1820,560 2120,570 L2120,1080 L-200,1080 Z" />
        <Layer id={id} at={s0 + 0.25} depth={2} rise={30} drift={-3} fill={D.hillMid}
          d="M-200,722 C260,650 520,690 820,700 C1100,710 1300,640 1600,670 C1760,685 1860,660 2120,665 L2120,1080 L-200,1080 Z" />
        <Layer id={id} at={s0 + 0.4} depth={2} rise={40} drift={-5} fill={P.royal}
          d="M-200,822 C300,760 600,800 900,790 C1200,780 1450,730 2120,780 L2120,1080 L-200,1080 Z" />
        {/* the path: on the ground, revealed from the viewer toward the horizon */}
        <g mask={`url(#${id}-reveal)`}>
          <path filter={`url(#${id}-shadow-1)`} fill={P.paper}
            d="M760,1080 C820,980 1000,940 980,860 C960,780 1180,760 1230,700 C1270,650 1310,620 1325,600 L1335,600 C1345,625 1330,660 1300,705 C1250,775 1080,800 1110,860 C1140,940 1060,1000 1160,1080 Z" />
        </g>
        <Layer id={id} at={s0 + 0.55} depth={3} rise={50} drift={-8} fill={D.royalDeep}
          d="M-200,960 C200,900 520,960 720,1000 L700,1080 L-200,1080 Z" />
        <Layer id={id} at={s0 + 0.55} depth={3} rise={50} drift={-8} fill={D.royalDeep}
          d="M1240,1080 C1380,990 1650,930 2120,920 L2120,1080 Z" />
        {stones.map((s, i) => <Stone key={i} i={i} s={s} at={firstStepAt + i * 0.55} first={i === 0} />)}
      </svg>

      <AbsoluteFill style={{ padding: `${L.safeY * 1.2}px ${L.safeX}px` }}>
        <div style={{ maxWidth: L.innerW * 0.5 }}>
          {lines.map((ln, i) => <Line key={i} text={ln.text} at={ln.at} size={L.size("h2")} />)}
          {script && <div style={{ marginTop: 4 * L.u }}><Script text={script.text} at={script.at} size={Math.round(100 * L.u)} color={P.paper} dur={1.8} /></div>}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Stone: React.FC<{ i: number; s: { x: number; y: number; rx: number; ry: number }; at: number; first: boolean }> = ({ s, at, first }) => {
  const p = useProgress(at, 0.7, ease.settle);
  const glow = useProgress(at + 0.1, 1.6, ease.settle);
  return (
    <g opacity={p} transform={`translate(0 ${(1 - p) * -10})`}>
      {first && <ellipse cx={s.x} cy={s.y} rx={s.rx * (1 + glow * 1.4)} ry={s.ry * (1 + glow * 1.4)} fill="none" stroke={P.rose} strokeWidth={2} opacity={(1 - glow) * 0.9} />}
      <ellipse cx={s.x} cy={s.y + s.ry * 0.35} rx={s.rx} ry={s.ry} fill="#1a0a0a" opacity={0.18} />
      <ellipse cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={first ? P.rose : P.oxblood} />
    </g>
  );
};

const Line: React.FC<{ text: string; at: number; size: number }> = ({ text, at, size }) => {
  const p = useProgress(at, 1.4, ease.settle);
  return (
    <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: size, lineHeight: 1.22, color: P.paper, wordSpacing: textStyle.wordSpacing, whiteSpace: "nowrap", opacity: p, filter: `blur(${(1 - p) * 5}px)`, transform: `translateY(${(1 - p) * 10}px)` }}>{text}</div>
  );
};
