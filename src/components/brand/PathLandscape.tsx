import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * "The First Step" — every moving element maps to the narration; everything else is still.
 *   • stepping stones appear  → steps: the first lights up on "first step", the rest follow
 *   • the sun rises at the far end of the path → "one of the most significant relationships of your life"
 * Geometry is computed from ONE centre-line, so stones sit exactly on the path by construction.
 */

// ---- geometry (1920×1080 artboard) ----
const HORIZON = (x: number) => 600 + 16 * Math.sin(x / 240 + 0.4); // far-hill ridge
const END = { x: 1330, y: HORIZON(1330) + 4 };                       // path vanishes on the ridge
const bez = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
};
/** Centre-line: one gentle S-curve from the viewer to the horizon. Chosen by an automated search so that
 *  the perspective-width edges never fold over themselves (0 folded samples at 400-sample resolution). */
const centre = (t: number): number[] => bez([1100, 1350], [700, 900], [1450, 700], [END.x, END.y], t); // starts below the frame: its end cap is never visible
const widthAt = (t: number) => 500 * Math.pow(1 - t, 1.6) + 6; // perspective: ~340 px wide at the frame edge, thin at the horizon
const SAMPLES = 120;
const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const t = i / SAMPLES, c = centre(t), c2 = centre(Math.min(1, t + 0.002)), c1 = centre(Math.max(0, t - 0.002));
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, w = widthAt(t) / 2;
  return { t, c, l: [c[0] + nx * w, c[1] + ny * w], r: [c[0] - nx * w, c[1] - ny * w] };
});
/** Path outline from the viewer up to fraction `upTo` of its length. */
const pathUpTo = (upTo: number) => {
  const vis = pts.filter((p) => p.t <= upTo + 1e-9);
  if (vis.length < 2) return "";
  const left = vis.map((p) => p.l), right = vis.map((p) => p.r).reverse();
  return `M${left.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" L")} L${right.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" L")} Z`;
};
const hill = (base: number, amp: number, freq: number, phase: number) => {
  const xs = Array.from({ length: 49 }, (_, i) => i * 40);
  return `M0,1080 L${xs.map((x) => `${x},${(base + amp * Math.sin(x / freq + phase)).toFixed(1)}`).join(" L")} L1920,1080 Z`;
};
// stones only on the visible stretch (the path enters the frame at t≈0.23)
const STONE_T = [0.27, 0.38, 0.49, 0.6, 0.7, 0.8];

export const PathLandscape: React.FC<{ scene: SceneOf<"pathLandscape"> }> = ({ scene }) => {
  const { lines, script, firstStepAt } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `pl-${scene.id}`;
  const destinationAt = script?.at ?? scene.endSec - 2;
  // The path is already laid (clean, still). Meaning is carried by the steps and the sunrise.
  const unroll = 1;
  // the sun rises fully clear of the horizon as "…relationships of your life" is spoken
  const rise = interpolate(t, [destinationAt - 1.5, destinationAt + 1.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const R = 92;
  const sunY = interpolate(rise, [0, 1], [END.y + R * 0.55, END.y - R - 40]);
  const stoneTimes = STONE_T.map((_, i) => (i === 0 ? firstStepAt : interpolate(i, [1, STONE_T.length - 1], [firstStepAt + 1.4, destinationAt - 0.4])));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.royalDeep} /><stop offset="42%" stopColor={P.royal} /><stop offset="58%" stopColor={D.skyTint} />
          </linearGradient>
          <radialGradient id={`${id}-halo`}><stop offset="0%" stopColor={P.paper} stopOpacity="0.85" /><stop offset="100%" stopColor={P.paper} stopOpacity="0" /></radialGradient>
          <clipPath id={`${id}-above`}><path d={`M0,0 L1920,0 L1920,${HORIZON(1920)} ${Array.from({ length: 49 }, (_, i) => 1920 - i * 40).map((x) => `L${x},${HORIZON(x).toFixed(1)}`).join(" ")} Z`} /></clipPath>
        </defs>
        <rect width="1920" height="1080" fill={`url(#${id}-sky)`} />
        {/* sun: clipped to the sky so it genuinely rises from behind the horizon, then sits fully above it */}
        <g clipPath={`url(#${id}-above)`}>
          <circle cx={END.x} cy={sunY} r={R * 3} fill={`url(#${id}-halo)`} opacity={0.15 + 0.35 * rise} />
          <circle cx={END.x} cy={sunY} r={R} fill={P.paper} />
        </g>
        {/* still landscape: hills do not move (no decorative motion) */}
        <path d={hill(600, 16, 240, 0.4)} fill={D.hillFar} filter={`url(#${id}-shadow-1)`} />
        <path d={hill(700, 22, 300, 2.1)} fill={D.hillMid} filter={`url(#${id}-shadow-2)`} />
        <path d={hill(810, 26, 360, 4.0)} fill={P.royal} filter={`url(#${id}-shadow-2)`} />
        {/* the path: one centre-line, perspective width; already laid (still) */}
        <path d={pathUpTo(1)} fill={P.paper} filter={`url(#${id}-shadow-1)`} />
        {STONE_T.map((st, i) => <Stone key={i} t={st} at={stoneTimes[i]} first={i === 0} visible={unroll >= st} />)}
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

/** A stepping stone placed ON the centre-line at fraction t, sized by the path width there. */
const Stone: React.FC<{ t: number; at: number; first: boolean; visible: boolean }> = ({ t, at, first, visible }) => {
  const p = useProgress(at, 0.6, ease.settle);
  const glow = useProgress(at + 0.1, 1.6, ease.settle);
  if (!visible) return null; // a stone never appears before the path has reached it
  const [x, y] = centre(t);
  const w = widthAt(t), rx = w * 0.2, ry = rx * 0.34;
  return (
    <g opacity={p}>
      {first && <ellipse cx={x} cy={y} rx={rx * (1 + glow * 1.6)} ry={ry * (1 + glow * 1.6)} fill="none" stroke={P.rose} strokeWidth={2.5} opacity={(1 - glow) * 0.9} />}
      <ellipse cx={x} cy={y + ry * 0.4} rx={rx} ry={ry} fill="#1a0a0a" opacity={0.16} />
      <ellipse cx={x} cy={y} rx={rx * (0.85 + 0.15 * p)} ry={ry * (0.85 + 0.15 * p)} fill={first ? P.rose : P.oxblood} />
    </g>
  );
};

const Line: React.FC<{ text: string; at: number; size: number }> = ({ text, at, size }) => {
  const p = useProgress(at, 1.4, ease.settle);
  return (
    <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: size, lineHeight: 1.22, color: P.paper, wordSpacing: textStyle.wordSpacing, whiteSpace: "nowrap", opacity: p, filter: `blur(${(1 - p) * 5}px)`, transform: `translateY(${(1 - p) * 10}px)` }}>{text}</div>
  );
};
