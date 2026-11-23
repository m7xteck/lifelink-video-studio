import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, PaperGround, Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import { Ink, Layer, PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * "Many Paths, One Door": each kind of learner starts from their own place (own colour, own path).
 * The paths join into one road that leads to an open, lit doorway: the programme.
 * Equal weighting: no numbers, no ranking; paths draw as each is spoken.
 */
export const ConvergingPaths: React.FC<{ scene: SceneOf<"convergingPaths"> }> = ({ scene }) => {
  const { kicker, items, closing } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const s0 = scene.startSec;
  const id = `cp-${scene.id}`;
  const n = items.length;
  const xs = n === 2 ? [560, 1360] : n === 3 ? [360, 960, 1560] : [300, 740, 1180, 1620];
  const colors = [P.sky, P.royal, P.rose, D.hillMid];
  const mergeY = 610, startY = 880, doorX = 960, doorTop = 200, doorBottom = 380;
  const door = useProgress(s0 + 0.3, 1.4, ease.settle);
  const light = useProgress(closing?.at ?? scene.endSec, 1.6, ease.settle);
  const leafOpen = useProgress(closing?.leadAt ?? (closing?.at ?? scene.endSec) - 1, 1.8, ease.settle);
  const sx = L.width / 1920, sy = L.height / 1080;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={61} />
      <svg viewBox="0 0 1920 1080" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P.paper} /><stop offset="100%" stopColor={D.skyTint} />
          </linearGradient>
          <linearGradient id={`${id}-spill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P.paper} stopOpacity="0.95" /><stop offset="100%" stopColor={P.paper} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* soft paper hills framing the lower corners */}
        <Layer id={id} at={s0 + 0.1} depth={2} rise={30} fill={D.paperShade} d="M-50,1080 L-50,860 C180,820 420,900 600,1080 Z" />
        <Layer id={id} at={s0 + 0.2} depth={2} rise={30} fill={D.paperShade} d="M1970,1080 L1970,840 C1720,810 1480,900 1320,1080 Z" />
        {/* the doorway */}
        <g opacity={door} transform={`translate(0 ${(1 - door) * 20})`}>
          <path d={`M${doorX - 150},${doorBottom + 140} L${doorX - 64},${doorBottom} L${doorX + 64},${doorBottom} L${doorX + 150},${doorBottom + 140} Z`} fill={`url(#${id}-spill)`} opacity={0.25 + light * 0.75} />
          <rect x={doorX - 74} y={doorTop - 10} width="148" height={doorBottom - doorTop + 10} rx="4" fill={P.oxblood} filter={`url(#${id}-shadow-2)`} />
          <rect x={doorX - 60} y={doorTop + 2} width="120" height={doorBottom - doorTop - 2} fill={`url(#${id}-light)`} opacity={0.35 + light * 0.65} />
          {/* door leaf, hinged on the left, swinging open */}
          <path d={`M${doorX - 60},${doorTop + 2} L${doorX - 60 + 120 * (1 - leafOpen * 0.78)},${doorTop + 2 + leafOpen * 14} L${doorX - 60 + 120 * (1 - leafOpen * 0.78)},${doorBottom - leafOpen * 14} L${doorX - 60},${doorBottom} Z`} fill={D.royalDeep} />
        </g>
        {/* paths: one per kind of learner, each in its own colour, drawing as it is spoken */}
        {items.map((it, i) => {
          const x = xs[i];
          const d = x === doorX ? `M${x},${startY} L${x},${mergeY}` : `M${x},${startY} C${x},${startY - 170} ${doorX + (x - doorX) * 0.25},${mergeY + 110} ${doorX},${mergeY}`;
          return (
            <g key={i} filter={`url(#${id}-shadow-1)`}>
              <Ink d={d} color={colors[i]} width={22} at={it.at - 0.1} dur={1.6} />
              <StartNode x={x} y={startY} color={colors[i]} at={it.at - 0.2} />
            </g>
          );
        })}
        {/* the shared road to the door */}
        <g filter={`url(#${id}-shadow-1)`}>
          <Ink d={`M${doorX},${mergeY} L${doorX},${doorBottom + 4}`} color={P.oxblood} width={30} at={closing?.leadAt ?? (closing?.at ?? scene.endSec) - 1} dur={1.2} cap="butt" />
        </g>
      </svg>

      {kicker && <div style={{ position: "absolute", left: L.safeX, top: L.safeY + 20 * L.u, opacity: useProgress(kicker.at, 0.9) }}><BrandLabel size={L.size("label")} color={P.royal}>{kicker.text}</BrandLabel></div>}
      {items.map((it, i) => (
        <div key={i} style={{ position: "absolute", left: xs[i] * sx - 230 * L.u, width: 460 * L.u, top: (startY + 34) * sy, textAlign: "center", fontFamily: fonts.text, fontSize: L.size("h3") - 4, lineHeight: 1.15, color: P.oxblood }}>
          <CharRise text={it.text} at={it.at + 0.1} stagger={0.016} />
        </div>
      ))}
      {closing && (
        <div style={{ position: "absolute", left: (doorX + 120) * sx, top: (doorTop + 30) * sy, width: 560 * L.u }}>
          {closing.lead && <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("h3") - 6, lineHeight: 1.2, color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing, opacity: useProgress(closing.leadAt ?? closing.at - 1, 1.0) }}>{closing.lead}</div>}
          <Script text={closing.text} at={closing.at} size={Math.round(84 * L.u)} color={P.royal} dur={1.4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const StartNode: React.FC<{ x: number; y: number; color: string; at: number }> = ({ x, y, color, at }) => {
  const p = useProgress(at, 0.6, ease.settle);
  return <circle cx={x} cy={y} r={20 * p} fill={P.paper} stroke={color} strokeWidth={8} />;
};
