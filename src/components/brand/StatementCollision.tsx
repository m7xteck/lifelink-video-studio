import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, InkWipe, PaperGround, Rule, Script, avoidScript } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useCameraDrift, useLeadIn, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 2: Important statement, "Editorial Collision".
 * Oversized typeset statement on cream; a script word crosses between the two lines in royal blue,
 * the way the references overlay script on structural type. One idea, one moment, nothing else.
 * A crossing phrase with a negation ("does not mean", "never") or a single short word is NOT set in Script (it reads
 * smaller and fainter than the type around it): it is written straight, in the text face, in royal (v004 review).
 * Without a label the first line enters with the narrator's first words (no blank opening).
 */
export const StatementCollision: React.FC<{ scene: SceneOf<"statementCollision"> }> = ({ scene }) => {
  const { label, first, script, second, caption } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const drift = useCameraDrift(1.015);
  // Fit the headline so each line stays on ONE line (this layout breaks when a phrase wraps into the caption).
  // shortcut: estimates glyph width at 0.55 em instead of measuring; switch to measureText if a font change makes it wrong.
  const maxBig = Math.round((L.portrait ? 150 : 196) * L.u);
  const avail = L.innerW * 0.86 - (L.portrait ? 0 : L.innerW * 0.12);
  const longest = Math.max(first.text.length, second.text.length, 1);
  const big = Math.min(maxBig, Math.floor(avail / (longest * 0.55)));
  const scriptSize = Math.round(big * 1.07);
  const settle = useProgress(script.at, 1.6, ease.settle);
  const asText = avoidScript(script.text);
  const leadAt = useLeadIn(scene, first.at);
  const firstAt = label ? first.at : leadAt;
  const textScriptSize = Math.round(Math.min(big * 0.62, (L.innerW * 0.8) / (script.text.length * 0.55)));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={13} />

      <div style={{ position: "absolute", left: L.safeX, top: L.safeY, display: "flex", alignItems: "center", gap: 22 * L.u, opacity: useProgress(scene.startSec + 0.1, 0.9) }}>
        {label && <Rule at={scene.startSec + 0.1} length={64 * L.u} color={P.rose} thickness={2} />}
        {label && <BrandLabel size={L.size("label")} color={D.oxbloodMuted}>{label}</BrandLabel>}
      </div>

      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: L.safeX, paddingRight: L.safeX }}>
        <div style={{ transform: `scale(${drift})`, transformOrigin: "left center", position: "relative", marginTop: -40 * L.u }}>
          <div style={{ fontFamily: fonts.text, fontSize: big, lineHeight: 0.98, color: P.oxblood, letterSpacing: "-0.035em" }}>
            <CharRise text={first.text} at={firstAt} stagger={0.03} />
          </div>
          {asText ? (
            <div style={{ position: "relative", zIndex: 2, paddingLeft: L.portrait ? "8%" : "14%", margin: `${Math.round(big * 0.16)}px 0 ${Math.round(big * 0.2)}px` }}>
              <InkWipe at={script.at} dur={Math.min(1.3, 0.5 + script.text.length * 0.05)} inline>
                <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: textScriptSize, lineHeight: 1.1, color: P.royal, letterSpacing: "-0.01em", whiteSpace: "nowrap", display: "inline-block", padding: "0.04em 0.06em 0.12em 0" }}>{script.text}</span>
              </InkWipe>
            </div>
          ) : (
          <div style={{ position: "relative", height: Math.round(scriptSize * 0.95), zIndex: 2 }}>
            <div style={{
              position: "absolute", left: L.portrait ? "8%" : "14%", top: -scriptSize * 0.12, // own row between the lines: no letters hidden
              transform: `rotate(-7deg) translateX(${(1 - settle) * 30}px)`, transformOrigin: "left center",
            }}>
              <Script text={script.text} at={script.at} size={scriptSize} color={P.royal} dur={1.3} overlapOk knockout={P.paper} />
            </div>
          </div>
          )}
          <div style={{ fontFamily: fonts.text, fontSize: big, lineHeight: 0.98, color: P.oxblood, letterSpacing: "-0.035em", paddingLeft: L.portrait ? 0 : L.innerW * 0.12 }}>
            <CharRise text={second.text} at={second.at} stagger={0.03} />
          </div>
        </div>
      </AbsoluteFill>

      {caption && (
        <div style={{ position: "absolute", right: L.safeX, bottom: L.safeY, width: L.portrait ? L.innerW : L.innerW * 0.34, opacity: useProgress(caption.at, 1.2), transform: `translateY(${(1 - useProgress(caption.at, 1.2)) * 10}px)` }}>
          <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("body"), lineHeight: 1.35, color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing }}>{caption.text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
