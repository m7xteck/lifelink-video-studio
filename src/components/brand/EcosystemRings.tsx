import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Marital ecosystem" — a stack of cut-paper discs, faith at the centre.
 *   • the centre disc (oxblood) is set down first on `centre.at`; its sub-label sets on `subAt`, the script word inks on `labelAt`
 *   • each named dimension is a larger paper sheet that opens out from beneath the stack on its cue (scale from the
 *     inner sheet's size to its own: the ecosystem widening). Sheets are slightly offset (down-left) so the stack reads as
 *     layered paper with real depth, not a target.
 *   • each name is set horizontally in a column to the left, joined to its own band by a fine leader rule that draws from
 *     the band outward; the dimension being discussed lifts (stronger shadow, small rise) and its name is in full ink
 *   • optional `notes` per ring: the spoken examples of the dimension being described appear in a quiet column at the right,
 *     one by one on their cues; the column hands over when the next ring is named
 *   • `focus` dims the other sheets (revisits / recap). Settled frames are still.
 */
const R0 = 132, BAND = 48;
const OFF = { x: -16, y: 9 };                // each outer sheet sits a little down-left of the one inside it
const FILLS = [P.royal, D.hillMid, D.hillFar, P.sky, D.skyTint];
const CY = 524;
/** Label height (relative to the centre) per ring index: inner rings near the middle, outer ones toward top/bottom. */
const LABEL_DY = [-44, 96, -186, 232, -322];
const LIFT = 9;

const radius = (i: number) => R0 + (i + 1) * BAND;     // ring i = sheet i (i = -1 is the centre disc)
const centreOf = (cx: number, i: number) => ({ x: cx + OFF.x * (i + 1), y: CY + OFF.y * (i + 1) });

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

/** One line when short; otherwise the most balanced two-line split. */
const wrap = (text: string, max = 14): string[] => {
  const w = text.trim().split(/\s+/);
  if (text.length <= max || w.length < 2) return [text];
  let best = [text], score = Infinity;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(" "), b = w.slice(i).join(" ");
    const sc = Math.max(a.length, b.length);
    if (sc < score) { score = sc; best = [a, b]; }
  }
  return best;
};

/** Left-side x of the visible part of band i on the horizontal line at y (mid-way between sheet i and sheet i-1 edges). */
const anchorX = (cx: number, i: number, y: number) => {
  const half = (j: number) => {
    const c = centreOf(cx, j), r = j < 0 ? R0 : radius(j);
    const dy = y - c.y;
    return Math.abs(dy) < r ? { left: c.x - Math.sqrt(r * r - dy * dy), ok: true } : { left: c.x, ok: false };
  };
  const outer = half(i), inner = half(i - 1);
  return (outer.left + (inner.ok ? inner.left : outer.left + 2 * BAND)) / 2;
};

export const EcosystemRings: React.FC<{ scene: SceneOf<"ecosystemRings"> }> = ({ scene }) => {
  const { centre, rings, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `er-${scene.id}`;
  const hasNotes = rings.some((r) => (r.notes?.length ?? 0) > 0);
  // with notes: stack left of centre, examples at the right; without: stack right of centre, names balancing it at the left
  // while only the centre is being described it sits at the centre of the frame; the stack settles left (80 px) as the
  // first dimension is named and its examples column opens at the right
  const settle = useProgress(rings[0].at, 1.4, ease.settle);
  const CX = hasNotes ? 960 - 80 * settle : 1080;
  const outerLeft = centreOf(hasNotes ? 880 : 1080, rings.length - 1).x - radius(rings.length - 1);
  const labelX = outerLeft - 44;
  const w = focusWeights(rings.length, focus, t);
  const disc = useProgress(centre.at, 1.2, ease.settle);
  // a blank sheet gives way once its coloured sheet has fully opened over it
  const sheetIn = rings.map((r) => interpolate(t, [r.at + 1.0, r.at + 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  // ring being discussed: the focused ring, else (when examples are being given) the most recently named ring
  const focusIdx = typeof focus === "number" ? focus
    : Array.isArray(focus) ? [...focus].sort((a, b) => a.at - b.at).filter((s) => s.at <= t).pop()?.index ?? null : null;
  // smooth 0..1 "lifted" weight per ring: rises when the ring is named, hands over when the next is named
  const lift = rings.map((r, i) => {
    if (focus !== undefined) return focusIdx === i ? 1 : 0;
    if (!hasNotes) return 0;
    const next = rings[i + 1];
    const on = interpolate(t, [r.at + 0.8, r.at + 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
    const off = next ? interpolate(t, [next.at, next.at + 0.8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle }) : 1;
    return Math.min(on, off);
  });
  const c0 = centreOf(CX, -1);

  return (
    <AbsoluteFill style={{ opacity: env.opacity, wordSpacing: textStyle.wordSpacing }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs><PaperTextureDefs id={id} strength={0.22} /></defs>
        {/* lead-in ("at the centre is…"): the places of the dimensions still to be named are already laid out as faint,
            unlabelled blank sheets, so the frame reads as the whole ecosystem waiting around its centre; each one is
            covered by its coloured sheet when it is named. They appear with the centre disc, then hold still. */}
        {rings.map((r, i) => ({ r, i })).reverse().map(({ i }) => {
          const c = centreOf(CX, i);
          const g = Math.min(disc, 1 - sheetIn[i]) * 0.9;
          return g > 0 ? (
            <g key={`ghost-${i}`} opacity={g}>
              <circle cx={c.x} cy={c.y} r={radius(i)} fill={D.paperShade} filter={`url(#${id}-shadow-1)`} opacity={0.75} />
              <circle cx={c.x} cy={c.y} r={radius(i) - 1} fill="none" stroke={D.hairline} strokeWidth={1.5} />
            </g>
          ) : null;
        })}
        {/* sheets: outermost first, so each inner sheet lies on top of the one around it */}
        {rings.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
          <Sheet key={i} id={id} i={i} cx={CX} at={r.at} weight={w[i]} lift={lift[i]} />
        ))}
        {/* centre disc */}
        {disc > 0 && (
          <g opacity={Math.min(1, disc * 4)} transform={`translate(0 ${((1 - disc) * -24).toFixed(2)})`}>
            {/* shadow and texture on separate copies: nested filters clip in Chromium */}
            <circle cx={c0.x} cy={c0.y} r={R0 * (0.9 + 0.1 * disc)} fill={P.oxblood} filter={`url(#${id}-shadow-3)`} />
            <circle cx={c0.x} cy={c0.y} r={R0 * (0.9 + 0.1 * disc)} fill={P.oxblood} filter={`url(#${id}-tex)`} />
            <circle cx={c0.x} cy={c0.y} r={R0 * (0.9 + 0.1 * disc) - 1.5} fill="none" stroke={P.rose} strokeWidth={1.5} opacity={0.55} />
          </g>
        )}
        {centre.sub && <CentreSub text={centre.sub} at={centre.subAt ?? centre.at + 0.6} cx={c0.x} />}
        <CentreWord id={`${id}-cw`} text={centre.label} at={centre.labelAt ?? centre.at + 0.4} cx={c0.x} hasSub={!!centre.sub} />
        {/* names + leader rules (on top of every sheet) */}
        {rings.map((r, i) => (
          <RingLabel key={i} cx={CX} i={i} at={r.at} label={r.label} labelX={labelX} weight={w[i]} lift={lift[i]} />
        ))}
      </svg>
      <TextureGate />
      {hasNotes && rings.map((r, i) => {
        const next = rings[i + 1];
        const show = focusIdx != null ? (focusIdx === i ? 1 : 0)
          : Math.min(
            interpolate(t, [r.at, r.at + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            next ? interpolate(t, [next.at - 0.5, next.at], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1);
        if (show <= 0) return null;
        return <Notes key={i} label={r.label} notes={r.notes ?? []} opacity={show} color={FILLS[i % FILLS.length]} u={L.width / 1920} left={centreOf(880, rings.length - 1).x + radius(rings.length - 1) + 70} />;
      })}
    </AbsoluteFill>
  );
};

/** One dimension: a paper sheet that opens out from beneath the stack on its cue; lifts while it is discussed. */
const Sheet: React.FC<{ id: string; i: number; cx: number; at: number; weight: number; lift: number }> = ({ id, i, cx, at, weight, lift }) => {
  const p = useProgress(at, 1.4, ease.settle);
  if (p <= 0) return null;
  const c = centreOf(cx, i), r = radius(i);
  const s = (radius(i - 1) / r) + (1 - radius(i - 1) / r) * p;   // starts hidden under the sheet inside it
  const fill = FILLS[i % FILLS.length];
  return (
    <g opacity={0.25 + 0.75 * weight} transform={`translate(0 ${(-LIFT * lift).toFixed(2)})`}>
      <circle cx={c.x} cy={c.y} r={r * s} fill={fill} filter={`url(#${id}-shadow-2)`} />
      {/* the lifted sheet casts a deeper shadow (cross-faded, no jump) */}
      {lift > 0 && <circle cx={c.x} cy={c.y} r={r * s} fill={fill} filter={`url(#${id}-shadow-3)`} opacity={lift} />}
      <circle cx={c.x} cy={c.y} r={r * s} fill={fill} filter={`url(#${id}-tex)`} />
      {/* fine cut edge catching the light */}
      <circle cx={c.x} cy={c.y} r={r * s - 1.5} fill="none" stroke={D.paperLight} strokeWidth={1.5} opacity={0.45 * Math.min(1, p * 2)} />
    </g>
  );
};

/** Horizontal name in the left column, joined to its band by a leader rule drawn from the band outward. */
const RingLabel: React.FC<{ cx: number; i: number; at: number; label: string; labelX: number; weight: number; lift: number }> = ({ cx, i, at, label, labelX, weight, lift }) => {
  const rule = useProgress(at + 0.7, 0.8, ease.settle);
  const tp = useProgress(at + 1.1, 0.9, ease.settle);
  if (rule <= 0) return null;
  const y = CY + LABEL_DY[i % LABEL_DY.length];
  const ax = anchorX(cx, i, y);
  const ay = y - LIFT * lift;
  const x1 = labelX + 16;
  const lines = wrap(label);
  const size = Math.max(28, Math.min(34, ...lines.map((l) => fit(l, 34, 290))));
  const lh = size * 1.18;
  const firstY = y + size * 0.34 - ((lines.length - 1) * lh) / 2;
  const ink = interpolate(lift, [0, 1], [0, 1]);
  return (
    <g opacity={0.35 + 0.65 * weight}>
      <path d={`M${ax.toFixed(1)},${ay.toFixed(1)} L${x1},${ay.toFixed(1)}`} stroke={P.oxblood} strokeWidth={1.5} opacity={0.75}
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - rule} fill="none" />
      <circle cx={ax} cy={ay} r={5} fill={P.oxblood} opacity={Math.min(1, rule * 3)} />
      {tp > 0 && (
        <text data-qa-text="" x={labelX} y={firstY} textAnchor="end" fontFamily={fonts.text} fontSize={size} opacity={tp}
          style={{ filter: tp < 1 ? `blur(${((1 - tp) * 5).toFixed(2)}px)` : undefined }}>
          {lines.map((l, k) => (
            <tspan key={k} x={labelX} dy={k ? lh : 0} fill={ink > 0.5 ? P.oxblood : D.oxbloodMuted}>{l}</tspan>
          ))}
        </text>
      )}
    </g>
  );
};

const CentreWord: React.FC<{ id: string; text: string; at: number; cx: number; hasSub: boolean }> = ({ id, text, at, cx, hasSub }) => {
  const dur = Math.min(1.6, 0.6 + text.length * 0.07);
  const p = useProgress(at, dur, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 80, 210, 0.5);
  const y = CY + (hasSub ? 40 : 24);
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx - 125} y={y - size * 1.1} width={250 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={cx} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={D.paperLight} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

const CentreSub: React.FC<{ text: string; at: number; cx: number }> = ({ text, at, cx }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  const size = Math.max(28, fit(text, 30, 220, 0.56));
  return <text data-qa-text="" x={cx} y={CY - 36} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.sky} opacity={p}
    style={{ filter: p < 1 ? `blur(${((1 - p) * 4).toFixed(2)}px)` : undefined }}>{text}</text>;
};

/** Right-hand column: the ring's name with a swatch of its colour, then its spoken examples, each on its cue. */
const Notes: React.FC<{ label: string; notes: { text: string; at: number }[]; opacity: number; color: string; u: number; left: number }> = ({ label, notes, opacity, color, u, left }) => (
  <div style={{ position: "absolute", left: left * u, top: 0, height: "100%", width: (1840 - left) * u, display: "flex", flexDirection: "column", justifyContent: "center", opacity }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 * u, marginBottom: 30 * u }}>
      <div style={{ width: 26 * u, height: 26 * u, borderRadius: "50%", background: color, flex: "none", boxShadow: "0 3px 8px rgba(26,10,10,0.18)" }} />
      <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: fit(label, 46, 1840 - left - 60, 0.56) * u, color: P.oxblood, lineHeight: 1.15 }}>{label}</span>
    </div>
    {notes.slice(0, 5).map((n, k) => <Note key={k} text={n.text} at={n.at} u={u} />)}
  </div>
);

const Note: React.FC<{ text: string; at: number; u: number }> = ({ text, at, u }) => {
  const p = useProgress(at, 0.8, ease.settle);
  // in-place focus entrance (no rising mask): soft blur clears as the words are spoken
  return (
    <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: 34 * u, color: D.oxbloodMuted, lineHeight: 1.25, padding: `${10 * u}px 0 ${10 * u}px ${44 * u}px`,
      opacity: p, filter: `blur(${((1 - p) * 6).toFixed(2)}px)`, borderLeft: `2px solid ${D.hairline}` }}>
      {text}
    </div>
  );
};
