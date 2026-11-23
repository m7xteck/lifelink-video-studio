import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, PaperGround, Rule, Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * "Equal Columns": parallel, non-ranked phrases (e.g. different kinds of learner).
 * Deliberately no numbers and no focus/dimming: every column is equally weighted, because
 * the content is inclusive, not sequential. Each column is ruled and set as it is spoken;
 * an optional closing line lands in script.
 */
export const ParallelPhrases: React.FC<{ scene: SceneOf<"parallelPhrases"> }> = ({ scene }) => {
  const { kicker, items, closing } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const n = items.length;
  const gap = 56 * L.u;
  // Four items in landscape set as a 2x2 grid (two per row, read row by row in spoken order) so each
  // phrase keeps s003's h2 size on one line, instead of four narrow columns at a reduced size.
  // Two or three items keep the single row (s003 unchanged).
  const grid = n === 4 && !L.portrait;
  const colW = L.portrait ? L.innerW : grid ? (L.innerW - gap) / 2 : (L.innerW - gap * (n - 1)) / n;
  const colSize = L.size("h2");
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={51} />
      {kicker && (
        <div style={{ position: "absolute", left: L.safeX, top: L.safeY + 20 * L.u, opacity: useProgress(kicker.at, 0.9) }}>
          <BrandLabel size={L.size("label")} color={P.royal}>{kicker.text}</BrandLabel>
        </div>
      )}
      <div style={{ position: "absolute", left: L.safeX, right: L.safeX, top: L.portrait ? L.height * 0.2 : grid ? L.height * 0.37 : L.height * 0.3, display: "flex", flexDirection: L.portrait ? "column" : "row", flexWrap: grid ? "wrap" : "nowrap", columnGap: gap, rowGap: grid ? 64 * L.u : gap }}>
        {items.map((it, i) => <Column key={i} text={it.text} at={it.at} width={colW} fontSize={colSize} />)}
      </div>
      {closing && (
        <div style={{ position: "absolute", left: L.safeX, right: L.safeX, bottom: L.safeY + 30 * L.u, display: "flex", alignItems: "baseline", gap: 24 * L.u, flexWrap: "wrap" }}>
          {closing.lead && (
            <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("h3"), color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing, opacity: useProgress(closing.leadAt ?? closing.at - 1, 1.0) }}>{closing.lead}</span>
          )}
          <Script text={closing.text} at={closing.at} size={Math.round(96 * L.u)} color={P.royal} dur={1.4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const Column: React.FC<{ text: string; at: number; width: number; fontSize: number }> = ({ text, at, width, fontSize }) => {
  const L = useLayout();
  const lift = useProgress(at, 1.2, ease.settle);
  return (
    <div style={{ width, transform: `translateY(${(1 - lift) * 14 * L.u}px)` }}>
      <Rule at={at - 0.2} length={width} color={P.oxblood} thickness={1.5} dur={1.0} />
      <div style={{ marginTop: 28 * L.u, fontFamily: fonts.text, fontSize, lineHeight: 1.14, color: P.oxblood, letterSpacing: "-0.01em" }}>
        <CharRise text={text} at={at + 0.05} stagger={0.016} />
      </div>
    </div>
  );
};
