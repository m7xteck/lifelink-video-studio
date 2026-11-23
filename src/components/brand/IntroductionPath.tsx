import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, PaperGround, Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 3: Educational diagram, "Two Journeys".
 * Two lines (two people) travel left to right through the stages of a process, drawing closer
 * at each stage, and finally become the interlocking link rings at the outcome.
 * Each stage gate rises exactly when the narrator names it.
 */
export const IntroductionPath: React.FC<{ scene: SceneOf<"introductionPath"> }> = ({ scene }) => {
  const { label, heading, stages, outcome } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const t = useNarrationTime();

  const headH = Math.round(190 * L.u);
  const x0 = L.safeX, x1 = L.width - L.safeX;
  const cy = L.safeY + headH + (L.height - L.safeY * 2 - headH) * 0.42;
  const xEnd = x0 + (x1 - x0) * 0.66; // where the two journeys meet
  const merged = useProgress(outcome.at - 0.1, 1.6, ease.settle);
  const node = useProgress(outcome.at - 0.2, 0.7, ease.enter);
  const n = stages.length;
  const gateX = stages.map((_, i) => x0 + (xEnd - x0) * ((i + 0.7) / (n + 0.5)));
  const spread0 = 150 * L.u;
  const spreadAt = (x: number) => spread0 * Math.max(0.0, 1 - (x - x0) / (xEnd - x0)) ** 1.15;

  // build smooth paths for both journeys
  const xs = [x0, ...gateX, xEnd];
  const pathFor = (sign: number) => xs.reduce((d, x, i) => {
    const y = cy + sign * spreadAt(x);
    if (i === 0) return `M ${x} ${y}`;
    const px = xs[i - 1], py = cy + sign * spreadAt(px), mx = (px + x) / 2;
    return `${d} C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`;
  }, "");
  // drawing progress (fraction of path), reaching gate i at stages[i].at and the end at outcome.at
  const times = [scene.startSec + 0.5, ...stages.map((s) => s.at), outcome.at];
  const fracs = xs.map((x) => (x - x0) / (xEnd - x0));
  let prog = 0;
  for (let i = 1; i < xs.length; i++) {
    const arrive = times[i], leave = Math.max(times[i - 1], arrive - 1.1);
    prog = Math.max(prog, interpolate(t, [leave, arrive], [fracs[i - 1], fracs[i]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle }));
  }
  const headX = x0 + prog * (xEnd - x0);
  const headIn = useProgress(scene.startSec + 0.3, 0.6);
  const current = stages.reduce((acc, s, i) => (t >= s.at ? i : acc), -1);
  const done = t >= outcome.at;
  const colW = ((xEnd - x0) / (n + 0.5)) * 0.92;
  // all gates share one top (numbers) and one bottom (labels): structure, not ragged text
  const gateTop = cy - spreadAt(gateX[0]) - 46 * L.u;
  const gateBottom = cy + spreadAt(gateX[0]) + 46 * L.u;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={21} />
      <div style={{ position: "absolute", left: L.safeX, top: L.safeY, opacity: useProgress(scene.startSec + 0.1, 1) }}>
        {label && <BrandLabel size={L.size("label")} color={P.royal}>{label}</BrandLabel>}
        <div style={{ marginTop: 16 * L.u, fontFamily: fonts.text, fontSize: L.size("h2"), color: P.oxblood, letterSpacing: "-0.01em" }}>
          <CharRise text={heading} at={scene.startSec + 0.2} stagger={0.018} />
        </div>
      </div>

      <svg width={L.width} height={L.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* faint guide of the whole route */}
        <path d={pathFor(-1)} fill="none" stroke={D.hairline} strokeWidth={1.2} strokeDasharray={`${2 * L.u} ${8 * L.u}`} />
        <path d={pathFor(1)} fill="none" stroke={D.hairline} strokeWidth={1.2} strokeDasharray={`${2 * L.u} ${8 * L.u}`} />
        <path d={pathFor(-1)} fill="none" stroke={P.oxblood} strokeWidth={2.4 * L.u} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog} strokeLinecap="round" />
        <path d={pathFor(1)} fill="none" stroke={P.royal} strokeWidth={2.4 * L.u} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog} strokeLinecap="round" />
        {!done && headIn > 0 && <>
          <circle cx={headX} cy={cy - spreadAt(headX)} r={6 * L.u} fill={P.oxblood} opacity={headIn} />
          <circle cx={headX} cy={cy + spreadAt(headX)} r={6 * L.u} fill={P.royal} opacity={headIn} />
        </>}
      </svg>

      {stages.map((s, i) => <Gate key={i} i={i} stage={s} x={gateX[i]} top={gateTop} bottom={gateBottom} colW={colW} focus={i === current && !done} past={i < current || done} />)}

      {/* the shared path: one line, two tones; each person stays whole within it */}
      <svg width={L.width} height={L.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={xEnd} y1={cy - 1.4 * L.u} x2={xEnd + (x1 - xEnd) * merged} y2={cy - 1.4 * L.u} stroke={P.oxblood} strokeWidth={2.6 * L.u} strokeLinecap="round" />
        <line x1={xEnd} y1={cy + 1.4 * L.u} x2={xEnd + (x1 - xEnd) * merged} y2={cy + 1.4 * L.u} stroke={P.royal} strokeWidth={2.6 * L.u} strokeLinecap="round" />
        <circle cx={xEnd} cy={cy} r={11 * L.u * node} fill={P.paper} stroke={P.oxblood} strokeWidth={2 * L.u} />
      </svg>
      <div style={{ position: "absolute", left: xEnd + 40 * L.u, right: L.safeX, top: cy - 150 * L.u, opacity: useProgress(outcome.at + 0.3, 1.0), transform: `translateY(${(1 - useProgress(outcome.at + 0.3, 1.0)) * 10}px)` }}>
        <BrandLabel size={L.size("label")} color={P.rose}>Outcome</BrandLabel>
        <div data-qa-text="" style={{ marginTop: 12 * L.u, fontFamily: fonts.text, fontSize: L.size("h1"), lineHeight: 1, color: P.oxblood, letterSpacing: "-0.02em" }}>{outcome.text}</div>
      </div>
      {outcome.caption && (
        <div style={{ position: "absolute", left: xEnd + 34 * L.u, top: cy + 26 * L.u }}>
          <Script text={outcome.caption} at={outcome.at + 1.2} size={Math.round(64 * L.u)} color={P.royal} dur={1.4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const Gate: React.FC<{ i: number; stage: { label: string; detail?: string; at: number }; x: number; top: number; bottom: number; colW: number; focus: boolean; past: boolean }> = ({ i, stage, x, top, bottom, colW, focus, past }) => {
  const L = useLayout();
  const rise = useProgress(stage.at - 0.15, 0.9, ease.enter);
  const txt = useProgress(stage.at + 0.1, 0.9);
  const h = bottom - top;
  return (
    <>
      <div style={{ position: "absolute", left: x - 0.75, top: top + (1 - rise) * h / 2, width: 1.5, height: h * rise, background: focus ? P.rose : D.hairline }} />
      <div style={{ position: "absolute", left: x - colW / 2, width: colW, top: top - 52 * L.u, textAlign: "center", opacity: rise }}>
        <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("label") + 2, letterSpacing: "0.2em", color: focus ? P.rose : D.oxbloodMuted, lineHeight: 1.2 }}>{String(i + 1).padStart(2, "0")}</span>
      </div>
      <div style={{ position: "absolute", left: x - colW / 2, width: colW, top: bottom + 22 * L.u, textAlign: "center", opacity: txt * (past ? 0.62 : 1), transform: `translateY(${(1 - txt) * 10}px)` }}>
        <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("body"), lineHeight: 1.22, color: P.oxblood, wordSpacing: textStyle.wordSpacing }}>{stage.label}</div>
        {stage.detail && <div data-qa-text="" style={{ marginTop: 10 * L.u, fontFamily: fonts.text, fontSize: L.size("label") + 4, lineHeight: 1.35, color: P.oxblood, opacity: 0.78, wordSpacing: textStyle.wordSpacing }}>{stage.detail}</div>}
      </div>
    </>
  );
};
