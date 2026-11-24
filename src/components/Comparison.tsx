import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, colors, ease, fonts, textStyle } from "../brand/tokens";
import { PaperGround, Script } from "../motion/brand";
import { useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;
type Side = SceneOf<"comparison">["props"]["left"];
type Pt = { text: string; at: number };

/** Points may be plain strings (staggered after the title, the original behaviour) or { text, at } cues. */
const pointsOf = (s: Side): Pt[] => s.points.map((p, i) => (typeof p === "string" ? { text: p, at: s.at + 0.5 + i * 0.35 } : p));

/**
 * Two ways of seeing something, set as an editorial spread: two sheets of cut paper side by side (stacked in
 * portrait), laid together as the first heading is spoken; each heading inks in on its own cue. Under the heading a fine ink rule draws; each
 * point is set on its own ruled line as it is spoken. If one side is preferred, once everything has been said
 * that sheet lifts a little further and its heading turns royal; the other settles back and quietens.
 * Short headings (≤ 3 words on both sides) are set in the script face; longer ones in the text face.
 */
export const Comparison: React.FC<{ scene: SceneOf<"comparison"> }> = ({ scene }) => {
  const { left, right, preferred } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const lp = pointsOf(left), rp = pointsOf(right);
  const lastCue = Math.max(left.at, right.at, ...lp.map((p) => p.at), ...rp.map((p) => p.at));
  const focusAt = Math.min(lastCue + 1.4, scene.endSec - 1.2);
  const focus = useProgress(Math.max(focusAt, Math.max(left.at, right.at) + 0.8), 1.1, ease.settle);
  const script = [left.title, right.title].every((t) => t.trim().split(/\s+/).length <= 3 && !/^I/.test(t.trim()));
  const maxPts = Math.max(lp.length, rp.length, 1);
  const ptSize = Math.round(L.size("h3") * (maxPts === 1 ? 1.12 : maxPts === 2 ? 1.04 : 0.96));
  const gutter = (L.portrait ? 48 : 76) * L.u;
  // reserve a second heading line only when a heading is long enough to wrap
  const titleLines = script ? 1 : Math.max(left.title.length, right.title.length) > (L.portrait ? 26 : 20) ? 2 : 1;
  // both sheets are laid at the start (the spread is balanced from the first frame; no empty half while the
  // first side is discussed); each heading, rule and point still waits for its own spoken cue
  const laidAt = Math.min(left.at, right.at) - 0.55;
  // the side whose heading comes later is laid as a ghost (~25 %) that reads as "to come", and becomes solid on its
  // heading cue (v004 review: an empty full-strength card for 4–11 s while the first side was discussed)
  const later: "left" | "right" | null = Math.abs(right.at - left.at) >= 1 ? (right.at > left.at ? "right" : "left") : null;
  const laterAt = later === "right" ? right.at : left.at;
  const common = { script, ptSize, rows: maxPts, preferred, focus, titleLines, laidAt, later, laterAt };
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={53} />
      <AbsoluteFill style={{ padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: L.portrait ? "column" : "row", alignItems: "stretch", gap: gutter }}>
          <Sheet side="left" data={left} pts={lp} seed={54} {...common} />
          <Sheet side="right" data={right} pts={rp} seed={57} {...common} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Sheet: React.FC<{
  side: "left" | "right"; data: Side; pts: Pt[]; seed: number; script: boolean; ptSize: number; rows: number;
  preferred: "left" | "right" | "none"; focus: number; titleLines: number; laidAt: number; later: "left" | "right" | null; laterAt: number;
}> = ({ side, data, pts, seed, script, ptSize, rows, preferred, focus, titleLines, laidAt, later, laterAt }) => {
  const L = useLayout();
  const lift = useProgress(laidAt + (side === "right" ? 0.3 : 0), 1.2, ease.settle);
  const solid = useProgress(laterAt - 0.35, 0.8, ease.settle);
  const ghost = later === side ? GHOST + (1 - GHOST) * solid : 1;
  const rule = useProgress(data.at + 0.15, 1.1, ease.settle);
  const isPref = preferred === side, isOther = preferred !== "none" && !isPref;
  const depth = 0.55 + (isPref ? 0.45 * focus : 0) - (isOther ? 0.35 * focus : 0);
  const quiet = isOther ? 1 - 0.42 * focus : 1;
  const titleColor = isPref ? mix(P.oxblood, P.royal, focus) : P.oxblood;
  const tab = preferred === "none" ? (side === "left" ? P.sky : P.royal) : isPref ? P.royal : D.oxbloodMuted;
  const pad = (L.portrait ? 44 : 64) * L.u;
  const titleSize = script ? L.size("h1") : L.size("h2");
  const rowH = ptSize * 1.25 * (rows <= 2 ? 2 : 1) + 30 * L.u; // single/double points may wrap to two lines
  const shadow = `0 ${(2 + depth * 8).toFixed(1)}px ${(4 + depth * 20).toFixed(1)}px rgba(26,10,10,${(0.05 + depth * 0.11).toFixed(3)}), 0 1px 1px rgba(26,10,10,0.07)`;
  return (
    <div style={{ flex: 1, position: "relative", transform: `translateY(${((1 - lift) * 40 - (isPref ? 6 * focus : 0)).toFixed(1)}px)`, opacity: Math.min(1, lift * 5) * ghost }}>
      {/* under-sheet: a darker layer just visible below, so the spread reads as stacked paper */}
      <div style={{ position: "absolute", left: 10 * L.u, right: -8 * L.u, top: 12 * L.u, bottom: -12 * L.u, background: D.paperShade, borderRadius: 3, boxShadow: "0 2px 6px rgba(26,10,10,0.08)" }} />
      <div style={{ position: "relative", height: "100%", borderRadius: 3, overflow: "hidden", boxShadow: shadow }}>
        <PaperGround color={D.paperLight} grain={0.07} seed={seed} />
        <div style={{ position: "absolute", left: pad, top: 0, width: 72 * L.u, height: 10 * L.u, background: tab }} />
        <div style={{ position: "relative", padding: `${pad * 1.05}px ${pad}px ${pad * 0.8}px`, opacity: quiet }}>
          <div style={{ minHeight: titleSize * (script ? 1.3 : 1.14 * titleLines), display: "flex", alignItems: "flex-end" }}>
            {script ? (
              <Script text={data.title} at={data.at} size={titleSize} color={titleColor} style={{ marginLeft: "-0.05em" }} />
            ) : (
              <Rise at={data.at} rise={14}>
                <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: titleSize, lineHeight: 1.12, color: titleColor, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.01em", textWrap: "balance" }}>{data.title}</div>
              </Rise>
            )}
          </div>
          <div style={{ height: 1.5, width: `${(rule * 100).toFixed(2)}%`, background: P.oxblood, opacity: 0.55, margin: `${22 * L.u}px 0 ${8 * L.u}px` }} />
          {Array.from({ length: rows }, (_, i) => {
            const pt = pts[i];
            return <PointRow key={i} pt={pt} index={i} numbered={rows > 1} size={ptSize} minH={rowH} last={i === rows - 1} accent={tab} />;
          })}
        </div>
      </div>
    </div>
  );
};

const PointRow: React.FC<{ pt?: Pt; index: number; numbered: boolean; size: number; minH: number; last: boolean; accent: string }> = ({ pt, index, numbered, size, minH, last, accent }) => {
  const L = useLayout();
  const at = pt?.at ?? 1e9;
  const p = useProgress(at, 0.9, ease.settle);
  const rule = useProgress(at + 0.2, 0.9, ease.settle);
  return (
    <div style={{ position: "relative", minHeight: minH, display: "flex", alignItems: "center", gap: 26 * L.u }}>
      {numbered && (
        <div style={{ flex: "none", width: 40 * L.u, fontFamily: fonts.text, fontSize: L.size("label"), letterSpacing: "0.16em", color: accent === D.oxbloodMuted ? D.oxbloodMuted : P.royal, opacity: p }}>
          {String(index + 1).padStart(2, "0")}
        </div>
      )}
      {pt && (
        <div style={{ overflow: "hidden", padding: "0.05em 0 0.18em", margin: "-0.05em 0 -0.18em" }}>
          <div data-qa-text="" style={{
            fontFamily: fonts.text, fontSize: size, lineHeight: 1.25, color: colors.ink, wordSpacing: textStyle.wordSpacing, textWrap: "balance",
            opacity: p < 0.02 ? 0 : Math.min(1, p * 1.6), transform: `translateY(${((1 - p) * size * 0.8).toFixed(1)}px)`,
          }}>{pt.text}</div>
        </div>
      )}
      {!last && <div style={{ position: "absolute", left: 0, bottom: 0, height: 1, width: `${(rule * 100).toFixed(2)}%`, background: D.hairline }} />}
    </div>
  );
};

const Rise: React.FC<{ at: number; rise: number; children: React.ReactNode }> = ({ at, rise, children }) => {
  const p = useProgress(at, 1.0, ease.settle);
  return <div style={{ opacity: p < 0.02 ? 0 : Math.min(1, p * 1.5), transform: `translateY(${((1 - p) * rise).toFixed(1)}px)` }}>{children}</div>;
};

const GHOST = 0.25;

const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
};
