import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Marital ecosystem" — concentric cut-paper rings around a centre disc (faith).
 *   • the centre disc is cut first on `centre.at`; its script word inks in, the small sub-label sets on `subAt`
 *   • each named dimension wraps a new ring around the previous ones (a clockwise sweep from 12 o'clock),
 *     its name set along the ring (alternating top / bottom arcs so labels never stack)
 *   • optional `notes` per ring: the spoken examples of the dimension currently being described appear in a quiet
 *     column at the right, one by one on their cues; the column hands over when the next ring is named
 *   • `focus` dims the other rings (revisits / recap). Settled frames are still.
 */
const R0 = 128, BAND = 60, GAP = 8;
const FILLS = [P.royal, D.hillMid, D.hillFar, P.sky, D.skyTint];
const INK_ON = [D.paperLight, D.paperLight, D.paperLight, P.oxblood, P.oxblood];
const CY = 540;
const SCALE = 0.9; // outermost ring stays well inside the frame
const ringMid = (i: number) => R0 + GAP + BAND / 2 + i * (BAND + GAP);

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const EcosystemRings: React.FC<{ scene: SceneOf<"ecosystemRings"> }> = ({ scene }) => {
  const { centre, rings, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `er-${scene.id}`;
  const hasNotes = rings.some((r) => (r.notes?.length ?? 0) > 0);
  const CX = hasNotes ? 700 : 960;
  const w = focusWeights(rings.length, focus, t);
  const disc = useProgress(centre.at, 1.2, ease.settle);

  // which ring's column is shown: the focused ring, else the most recently named ring
  const focusIdx = typeof focus === "number" ? focus
    : Array.isArray(focus) ? [...focus].sort((a, b) => a.at - b.at).filter((s) => s.at <= t).pop()?.index ?? null : null;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <g transform={`translate(${CX} ${CY}) scale(${SCALE}) translate(${-CX} ${-CY})`}>
        {/* outer rings first so each inner ring sits on top of the one around it */}
        {rings.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
          <Ring key={i} id={id} i={i} cx={CX} at={r.at} label={r.label} weight={w[i]} />
        ))}
        {/* centre disc */}
        {disc > 0 && (
          <g opacity={Math.min(1, disc * 4)} transform={`translate(${CX} ${CY}) scale(${0.82 + 0.18 * disc}) translate(${-CX} ${-CY})`}>
            <circle cx={CX} cy={CY} r={R0} fill={P.oxblood} filter={`url(#${id}-shadow-3)`} />
            <circle cx={CX} cy={CY} r={R0 - 12} fill="none" stroke={P.rose} strokeWidth={2} opacity={0.6} />
          </g>
        )}
        {centre.sub && <CentreSub text={centre.sub} at={centre.subAt ?? centre.at + 0.6} cx={CX} />}
        <CentreWord id={`${id}-cw`} text={centre.label} at={centre.labelAt ?? centre.at + 0.4} cx={CX} hasSub={!!centre.sub} />
        </g>
      </svg>
      {hasNotes && rings.map((r, i) => {
        const next = rings[i + 1];
        const show = focusIdx != null ? (focusIdx === i ? 1 : 0)
          : Math.min(
            interpolate(t, [r.at, r.at + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            next ? interpolate(t, [next.at - 0.5, next.at], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1);
        if (show <= 0) return null;
        return <Notes key={i} label={r.label} notes={r.notes ?? []} opacity={show} color={FILLS[i % FILLS.length]} u={L.width / 1920} />;
      })}
    </AbsoluteFill>
  );
};

/** One dimension: a paper ring swept clockwise from 12 o'clock around everything inside it, then its name set on the ring. */
const Ring: React.FC<{ id: string; i: number; cx: number; at: number; label: string; weight: number }> = ({ id, i, cx, at, label, weight }) => {
  const p = useProgress(at, 1.5, ease.settle);
  const lp = useProgress(at + 0.9, 0.9, ease.settle);
  if (p <= 0) return null;
  const r = ringMid(i);
  const top = i % 2 === 0;
  const size = fit(label, 32, Math.PI * r * 0.62, 0.6);
  // text centred on the band: baseline sits inside (top arc) or outside (bottom arc) of the mid-radius
  const br = top ? r - size * 0.34 : r + size * 0.34;
  const arc = top ? `M${cx - br},${CY} A${br},${br} 0 0 1 ${cx + br},${CY}` : `M${cx - br},${CY} A${br},${br} 0 0 0 ${cx + br},${CY}`;
  const pathId = `${id}-arc${i}`;
  return (
    <g opacity={weight}>
      <circle cx={cx} cy={CY} r={r} fill="none" stroke={FILLS[i % FILLS.length]} strokeWidth={BAND} pathLength={1}
        strokeDasharray="1 1" strokeDashoffset={1 - p} transform={`rotate(-90 ${cx} ${CY})`} filter={`url(#${id}-shadow-2)`} />
      {/* fine cut edge on the inside of the band */}
      <circle cx={cx} cy={CY} r={r - BAND / 2 + 5} fill="none" stroke={D.paperLight} strokeWidth={1.5} opacity={0.35 * Math.min(1, p * 1.5)}
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} transform={`rotate(-90 ${cx} ${CY})`} />
      <path id={pathId} d={arc} fill="none" stroke="none" />
      {lp > 0 && (
        <text data-qa-text="" data-qa-overlap-ok="" fontFamily={fonts.text} fontSize={size} fill={INK_ON[i % INK_ON.length]} opacity={lp} letterSpacing={size * 0.06}>
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">{label}</textPath>
        </text>
      )}
    </g>
  );
};

const CentreWord: React.FC<{ id: string; text: string; at: number; cx: number; hasSub: boolean }> = ({ id, text, at, cx, hasSub }) => {
  const dur = Math.min(1.6, 0.6 + text.length * 0.07);
  const p = useProgress(at, dur, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 76, 200, 0.5);
  const y = CY + (hasSub ? 34 : 22);
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx - 120} y={y - size * 1.1} width={240 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={cx} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={D.paperLight} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

const CentreSub: React.FC<{ text: string; at: number; cx: number }> = ({ text, at, cx }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 24, 190, 0.58);
  return <text data-qa-text="" x={cx} y={CY - 34} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.sky} opacity={p} letterSpacing={size * 0.04}>{text}</text>;
};

/** Right-hand column: the ring's name with a swatch of its colour, then its spoken examples, each on its cue. */
const Notes: React.FC<{ label: string; notes: { text: string; at: number }[]; opacity: number; color: string; u: number }> = ({ label, notes, opacity, color, u }) => (
  <div style={{ position: "absolute", left: 1240 * u, top: 0, height: "100%", width: 560 * u, display: "flex", flexDirection: "column", justifyContent: "center", opacity }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 * u, marginBottom: 30 * u }}>
      <div style={{ width: 26 * u, height: 26 * u, borderRadius: "50%", background: color, flex: "none", boxShadow: "0 3px 8px rgba(26,10,10,0.18)" }} />
      <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: fit(label, 46, 500, 0.56) * u, color: P.oxblood, lineHeight: 1.15 }}>{label}</span>
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
