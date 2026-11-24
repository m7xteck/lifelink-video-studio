import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { InkWipe, PaperGround } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * "Question": a reflection question to sit with. A large script question mark is cut out at the
 * left (ink wipe, then it lifts off the page on a soft paper shadow); the question is set beside it
 * with generous space, each line surfacing as it is asked. Nothing moves once the question is complete.
 */
export const QuestionPrompt: React.FC<{ scene: SceneOf<"questionPrompt"> }> = ({ scene }) => {
  const { lines, markAt, ground } = scene.props;
  const L = useLayout();
  const royal = ground === "royal";
  const env = useSceneEnvelope(royal ? { fadeIn: 1.3, fadeOut: 1.3 } : {});
  const mAt = markAt ?? lines[0].at - 0.5;
  const lift = useProgress(mAt + 0.6, 1.0, ease.settle);
  const markSize = Math.round(440 * L.u);
  const textLeft = L.portrait ? L.safeX : L.safeX + 400 * L.u;
  const textW = L.width - textLeft - L.safeX;
  const longest = Math.max(...lines.map((l) => l.text.length));
  const fs = Math.round(Math.min(lines.length <= 2 ? L.size("h1") : L.size("h2"), textW / (longest * 0.56)));
  const ink = royal ? P.paper : P.oxblood;
  const markColor = royal ? P.sky : P.royal;
  const shadow = `drop-shadow(0 ${(lift * 10).toFixed(1)}px ${(lift * 14).toFixed(1)}px rgba(26,10,10,${(lift * (royal ? 0.32 : 0.2)).toFixed(3)}))`;
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      {royal ? <PaperGround color={P.royal} deep={D.royalDeep} grain={0.12} seed={41} /> : <PaperGround color={P.paper} deep={D.paperShade} seed={43} />}
      <div style={{ position: "absolute", left: L.portrait ? L.safeX : L.safeX + 20 * L.u, top: L.portrait ? L.safeY : L.height / 2 - markSize * 0.66, filter: shadow }}>
        <InkWipe at={mAt} dur={1.2} inline>
          <span data-qa-text="" style={{ fontFamily: fonts.script, fontSize: markSize, lineHeight: 1.2, color: markColor, display: "inline-block", padding: "0 0.12em 0.1em 0.06em" }}>?</span>
        </InkWipe>
      </div>
      <AbsoluteFill style={{ justifyContent: L.portrait ? "flex-end" : "center", paddingLeft: textLeft, paddingRight: L.safeX, paddingBottom: L.portrait ? L.safeY * 2 : 0 }}>
        <div>
          {lines.map((ln, i) => <QLine key={i} text={ln.text} at={ln.at} size={fs} color={ink} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const QLine: React.FC<{ text: string; at: number; size: number; color: string }> = ({ text, at, size, color }) => {
  const p = useProgress(at, 1.3, ease.settle);
  return (
    <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: size, lineHeight: 1.3, color, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.01em", whiteSpace: "nowrap", opacity: p, filter: `blur(${((1 - p) * 5).toFixed(2)}px)`, transform: `translateX(${((1 - p) * 24).toFixed(1)}px)` }}>
      {text}
    </div>
  );
};
