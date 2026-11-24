import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { colors, ease, fonts, type } from "../brand/tokens";
import { Label, SoftReveal } from "../motion/Primitives";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/**
 * Progressive process diagram. A single path travels from step to step,
 * arriving at each node exactly when the narrator introduces that step.
 * The current step is in focus; earlier steps recede but remain visible.
 */
export const StepsDiagram: React.FC<{ scene: SceneOf<"stepsDiagram"> }> = ({ scene }) => {
  const { heading, steps } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const t = useNarrationTime();
  const vertical = L.portrait || scene.props.layout === "stack";
  const n = steps.length;

  // Path progress 0..1: reaches node i at steps[i].at, travelling during the 0.7s before.
  const fracs = steps.map((_, i) => (n === 1 ? 0 : i / (n - 1)));
  let pathP = 0;
  for (let i = 0; i < n; i++) {
    const arrive = steps[i].at;
    const leave = i === 0 ? arrive - 0.5 : Math.max(steps[i - 1].at, arrive - 0.7);
    const from = i === 0 ? 0 : fracs[i - 1];
    if (t < leave) break; // never draw toward a step that has not been introduced yet
    pathP = Math.max(pathP, interpolate(t, [leave, arrive], [from, fracs[i]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle }));
  }
  const current = steps.reduce((acc, s, i) => (t >= s.at ? i : acc), -1);

  const headH = heading ? Math.round(150 * L.u) : 0;
  const areaW = L.innerW;
  const areaH = L.innerH - headH;
  const r = Math.round(42 * L.u);

  const pts = steps.map((_, i) => {
    const f = fracs[i];
    if (vertical) return { x: r + 4, y: r + 4 + f * (areaH - 2 * r - 8 - Math.round(120 * L.u)) };
    const x = areaW * 0.06 + f * areaW * 0.88;
    const y = areaH * 0.42 + (i % 2 === 0 ? -1 : 1) * areaH * 0.06;
    return { x, y };
  });
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const q = pts[i - 1];
    const mx = (q.x + p.x) / 2, my = (q.y + p.y) / 2;
    return vertical ? `${acc} C ${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}` : `${acc} C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const colW = vertical ? areaW - (r * 2 + 40) : (areaW * 0.88) / Math.max(1, n - 1) * 0.92;

  return (
    <AbsoluteFill style={{ opacity: env.opacity, padding: `${L.safeY}px ${L.safeX}px` }}>
      {heading && (
        <div style={{ height: headH }}>
          <SoftReveal at={scene.startSec + 0.1} rise={8}>
            <div data-qa-text style={{ marginTop: Math.round(14 * L.u), fontFamily: fonts.display, fontSize: L.size("h2"), lineHeight: type.lineHeight.display, color: colors.ink }}>{heading}</div>
          </SoftReveal>
        </div>
      )}
      <div style={{ position: "relative", width: areaW, height: areaH }}>
        <svg width={areaW} height={areaH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={d} fill="none" stroke={colors.line} strokeWidth={2 * L.u} strokeDasharray={`${3 * L.u} ${9 * L.u}`} />
          <path d={d} fill="none" stroke={colors.accent} strokeWidth={2.5 * L.u} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pathP} strokeLinecap="round" />
        </svg>
        {steps.map((s, i) => <Node key={i} i={i} step={s} p={pts[i]} r={r} vertical={vertical} colW={colW} focus={i === current} past={i < current} />)}
      </div>
    </AbsoluteFill>
  );
};

const Node: React.FC<{
  i: number; step: { label: string; detail?: string; at: number }; p: { x: number; y: number }; r: number;
  vertical: boolean; colW: number; focus: boolean; past: boolean;
}> = ({ i, step, p, r, vertical, colW, focus, past }) => {
  const L = useLayout();
  const appear = useProgress(step.at, 0.6);
  const textP = useProgress(step.at + 0.12, 0.8);
  const dim = past ? 0.55 : 1;
  const ring = focus ? 1 : 0;
  return (
    <>
      <div style={{
        position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: 999,
        border: `${Math.max(1.5, 2 * L.u)}px solid ${colors.accent}`, background: focus ? colors.accent : colors.surface,
        transform: `scale(${appear})`, opacity: appear, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: ring ? `0 0 0 ${10 * L.u}px ${colors.accent}1f` : "none",
      }}>
        <span style={{ fontFamily: fonts.display, fontSize: Math.round(34 * L.u), color: focus ? colors.backgroundDeep : colors.accent }}>{i + 1}</span>
      </div>
      <div style={{
        position: "absolute",
        left: vertical ? p.x + r + 32 * L.u : Math.min(Math.max(p.x - colW / 2, 0), L.innerW - colW), // keep edge labels inside the safe area
        top: vertical ? p.y - r * 0.75 : p.y + r + 26 * L.u,
        width: colW, textAlign: vertical ? "left" : "center",
        opacity: textP * dim, transform: `translateY(${(1 - textP) * 12}px)`,
      }}>
        <div data-qa-text style={{ fontFamily: fonts.text, fontWeight: 600, fontSize: L.size("body"), lineHeight: type.lineHeight.text, color: colors.ink }}>{step.label}</div>
        {step.detail && <div data-qa-text style={{ marginTop: 8 * L.u, fontFamily: fonts.text, fontSize: L.size("caption") + 4, lineHeight: type.lineHeight.text, color: colors.inkMuted }}>{step.detail}</div>}
      </div>
    </>
  );
};
