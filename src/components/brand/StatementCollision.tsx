import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, PaperGround, Rule, Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useCameraDrift, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 2: Important statement, "Editorial Collision".
 * Oversized typeset statement on cream; a script word crosses between the two lines in royal blue,
 * the way the references overlay script on structural type. One idea, one moment, nothing else.
 */
export const StatementCollision: React.FC<{ scene: SceneOf<"statementCollision"> }> = ({ scene }) => {
  const { label, first, script, second, caption } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const drift = useCameraDrift(1.015);
  const big = Math.round((L.portrait ? 150 : 196) * L.u);
  const scriptSize = Math.round((L.portrait ? 170 : 210) * L.u);
  const settle = useProgress(script.at, 1.6, ease.settle);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={13} />

      <div style={{ position: "absolute", left: L.safeX, top: L.safeY, display: "flex", alignItems: "center", gap: 22 * L.u, opacity: useProgress(scene.startSec + 0.1, 0.9) }}>
        <Rule at={scene.startSec + 0.1} length={64 * L.u} color={P.rose} thickness={2} />
        {label && <BrandLabel size={L.size("label")} color={D.oxbloodMuted}>{label}</BrandLabel>}
      </div>

      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: L.safeX, paddingRight: L.safeX }}>
        <div style={{ transform: `scale(${drift})`, transformOrigin: "left center", position: "relative", marginTop: -40 * L.u }}>
          <div style={{ fontFamily: fonts.text, fontSize: big, lineHeight: 0.98, color: P.oxblood, letterSpacing: "-0.035em" }}>
            <CharRise text={first.text} at={first.at} stagger={0.03} />
          </div>
          <div style={{ position: "relative", height: Math.round(big * 0.34), zIndex: 2 }}>
            <div style={{
              position: "absolute", left: L.portrait ? "16%" : "27%", top: -scriptSize * 0.6,
              transform: `rotate(-7deg) translateX(${(1 - settle) * 30}px)`, transformOrigin: "left center",
            }}>
              <Script text={script.text} at={script.at} size={scriptSize} color={P.royal} dur={1.3} overlapOk knockout={P.paper} />
            </div>
          </div>
          <div style={{ fontFamily: fonts.text, fontSize: big, lineHeight: 0.98, color: P.oxblood, letterSpacing: "-0.035em", paddingLeft: L.portrait ? 0 : L.innerW * 0.12 }}>
            <CharRise text={second.text} at={second.at} stagger={0.03} />
          </div>
        </div>
      </AbsoluteFill>

      {caption && (
        <div style={{ position: "absolute", right: L.safeX, bottom: L.safeY, width: L.portrait ? L.innerW : L.innerW * 0.34, opacity: useProgress(caption.at, 1.2), transform: `translateY(${(1 - useProgress(caption.at, 1.2)) * 10}px)` }}>
          <Rule at={caption.at} length={60 * L.u} color={P.oxblood} style={{ marginBottom: 18 * L.u }} />
          <div data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("body") - 4, lineHeight: 1.35, color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing }}>{caption.text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
