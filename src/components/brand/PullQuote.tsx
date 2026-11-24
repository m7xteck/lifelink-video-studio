import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { InkWipe, PaperGround } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;
const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");

/**
 * "Pull quote": a teaching line of the narrator's given editorial weight. An oversized opening
 * quote mark, cut from royal paper, lands just before the sentence; each line is then written
 * left→right with an ink wipe as it is spoken. Key words take the royal ink. No kicker, no rule.
 */
export const PullQuote: React.FC<{ scene: SceneOf<"pullQuote"> }> = ({ scene }) => {
  const { lines, emphasis, attribution } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const id = `pq-${scene.id}`;
  const markAt = lines[0].at - 0.55;
  const emph = new Set(emphasis.flatMap((e) => e.split(/\s+/)).map(norm));
  const textLeft = L.portrait ? L.safeX : L.safeX + 330 * L.u;
  const textW = L.width - textLeft - L.safeX;
  const longest = Math.max(...lines.map((l) => l.text.length));
  const fs = Math.round(Math.min(lines.length <= 2 ? L.size("h1") : L.size("h2"), textW / (longest * 0.56)));
  const attrP = useProgress(attribution?.at ?? scene.endSec + 99, 1.0, ease.settle);
  // the mark sits to the left of the first line's cap height
  // the pair hangs above-left of the first line, ball resting just below its cap height (classic pull quote)
  const markR = 46 * L.u;
  const blockH = lines.length * fs * 1.26 + (attribution ? 34 * L.u + L.size("body") * 1.3 : 0);
  const textTop = L.portrait ? L.height * 0.6 - blockH / 2 : L.height / 2 - blockH / 2;
  const my = textTop + 0.6 * markR, mx = L.portrait ? L.safeX + markR : L.safeX + 40 * L.u;
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={23} />
      <svg viewBox={`0 0 ${L.width} ${L.height}`} width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <QuoteMark id={id} cx={mx} cy={L.portrait ? textTop - 3.4 * markR : my} r={markR} at={markAt} fill={P.royal} />
        <QuoteMark id={id} cx={mx + 2.85 * markR} cy={L.portrait ? textTop - 3.4 * markR : my} r={markR} at={markAt + 0.18} fill={P.royal} />
      </svg>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: textLeft, paddingRight: L.safeX, paddingTop: L.portrait ? L.height * 0.2 : 0, paddingBottom: 0 }}>
        <div>
          {lines.map((ln, i) => (
            <InkWipe key={i} at={ln.at} dur={Math.min(1.6, 0.5 + ln.text.length * 0.025)}>
              <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: fs, lineHeight: 1.26, color: P.oxblood, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                {ln.text.split(/\s+/).map((w, wi, arr) => (
                  <React.Fragment key={wi}>
                    <span style={{ color: emph.has(norm(w)) ? P.royal : undefined }}>{w}</span>
                    {wi < arr.length - 1 ? " " : null}
                  </React.Fragment>
                ))}
              </div>
            </InkWipe>
          ))}
          {attribution && (
            <div data-qa-text="" style={{ marginTop: 34 * L.u, fontFamily: fonts.text, fontSize: L.size("body"), color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing, opacity: attrP, transform: `translateY(${(1 - attrP) * 10}px)` }}>
              — {attribution.text}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** One "6"-shaped opening quote, cut from paper: a round ball with a tail curling up and to the right. */
const QuoteMark: React.FC<{ id: string; cx: number; cy: number; r: number; at: number; fill: string }> = ({ id, cx, cy, r: R, at, fill }) => {
  const p = useProgress(at, 1.1, ease.settle);
  const d = [
    `M ${cx + R} ${cy}`,
    `A ${R} ${R} 0 1 1 ${cx - R} ${cy}`,
    `C ${cx - R} ${cy - 1.7 * R} ${cx - 0.1 * R} ${cy - 2.75 * R} ${cx + 1.05 * R} ${cy - 3.05 * R}`,
    `L ${cx + 1.12 * R} ${cy - 2.62 * R}`,
    `C ${cx + 0.35 * R} ${cy - 2.3 * R} ${cx - 0.05 * R} ${cy - 1.65 * R} ${cx + 0.02 * R} ${cy - R}`,
    `A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`,
  ].join(" ");
  return <path d={d} fill={fill} filter={`url(#${id}-shadow-2)`} opacity={Math.min(1, p * 4)} transform={`translate(0 ${((1 - p) * 36).toFixed(2)})`} />;
};
