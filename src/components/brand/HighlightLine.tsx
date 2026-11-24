import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { PaperGround } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useLeadIn, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * "Highlighter": one sentence set large, words surfacing softly (focus pull, no masks, no kicker, no rule).
 * On the emphasis cue a marker sweep draws left→right behind the key words, the way a reader marks
 * the line that matters. Still once the sweep has landed.
 * The marker is ALWAYS the pale sky tint behind ink (v004 review: the solid royal block read as a text selection and
 * made the ink unreadable mid-sweep). `tint: "royal"` is kept for old manifests and renders the same pale tint.
 * The sweep never starts before the marked words have resolved (no tint over blurred type).
 */
export const HighlightLine: React.FC<{ scene: SceneOf<"highlightLine"> }> = ({ scene }) => {
  const { lines, highlight } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const longest = Math.max(...lines.map((l) => l.text.length));
  // h1 by default; very long lines step down so authored breaks never wrap
  const fs = Math.round(Math.min(L.size("h1"), (L.innerW * 0.92) / (longest * 0.56)));
  const hl = highlight.text.trim();
  const hlLine = lines.findIndex((l) => l.text.includes(hl));
  // no blank seconds: the first line enters with the narrator's first words of the scene
  const line0At = useLeadIn(scene, lines[0].at);
  const atOf = (i: number) => (i === 0 ? line0At : lines[i].at);
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={13} />
      <AbsoluteFill style={{ justifyContent: "center", padding: `${L.safeY}px ${L.safeX}px` }}>
        <div style={{ marginTop: -40 * L.u }}>
          {lines.map((ln, i) => {
            const idx = i === hlLine ? ln.text.indexOf(hl) : -1;
            const before = idx >= 0 ? ln.text.slice(0, idx) : ln.text;
            const after = idx >= 0 ? ln.text.slice(idx + hl.length) : "";
            const nBefore = before.split(/\s+/).filter(Boolean).length;
            const lnAt = atOf(i);
            const hlWordsAt = lnAt + nBefore * 0.07;
            // marked words are fully resolved (0.7 s focus pull + stagger) before the tint starts to sweep
            const markAt = Math.max(highlight.at, hlWordsAt + (hl.split(/\s+/).length - 1) * 0.07 + 0.6);
            return (
              <div key={i} data-qa-text="" style={{ fontFamily: fonts.text, fontSize: fs, lineHeight: 1.3, color: P.oxblood, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                <SoftWords text={before} at={lnAt} />
                {idx >= 0 && (
                  <Marker at={markAt}>
                    <SoftWords text={hl} at={hlWordsAt} />
                  </Marker>
                )}
                {after && <SoftWords text={after} at={lnAt + (nBefore + hl.split(/\s+/).length) * 0.07} />}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Words surface with a soft focus pull, staggered from `at`. Keeps leading/trailing spaces. */
const SoftWords: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const parts = text.split(/(\s+)/);
  let w = 0;
  return (
    <>
      {parts.map((p, i) => (/^\s+$/.test(p) || p === "" ? (p ? <React.Fragment key={i}> </React.Fragment> : null) : <SoftWord key={i} at={at + w++ * 0.07}>{p}</SoftWord>))}
    </>
  );
};
const SoftWord: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const p = useProgress(at, 0.7, ease.settle);
  return <span style={{ display: "inline-block", opacity: p, filter: `blur(${((1 - p) * 5).toFixed(2)}px)`, transform: `translateY(${((1 - p) * 10).toFixed(1)}px)` }}>{children}</span>;
};

/** Marker band (slightly irregular, like a broad nib) that sweeps behind its children: pale sky tint, ink stays ink. */
const Marker: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const p = useProgress(at, 0.9, ease.settle);
  return (
    <span style={{ position: "relative", display: "inline-block", isolation: "isolate", color: P.oxblood }}>
      <span style={{ position: "absolute", left: "-0.14em", right: "-0.14em", top: "0.06em", bottom: "-0.02em", zIndex: -1, clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` }}>
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block" }}>
          <path d="M1.5,3.6 C25,1.6 60,2.8 98.6,1.4 L99.2,17.6 C66,19.2 30,17.8 0.6,18.8 Z" fill={D.skyTint} />
        </svg>
      </span>
      {children}
    </span>
  );
};
