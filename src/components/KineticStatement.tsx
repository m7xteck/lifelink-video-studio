import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, type } from "../brand/tokens";
import { MaskedWords } from "../motion/Primitives";
import { useCameraDrift, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/** A principle stated with typographic weight. Each line arrives as it is spoken. */
export const KineticStatement: React.FC<{ scene: SceneOf<"kineticStatement"> }> = ({ scene }) => {
  const { lines, emphasis, align, scale } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const drift = useCameraDrift();
  const center = align === "center";
  return (
    <AbsoluteFill style={{ opacity: env.opacity, justifyContent: "center", alignItems: center ? "center" : "flex-start", padding: `${L.safeY}px ${L.safeX}px` }}>
      <div style={{ transform: `scale(${drift})`, transformOrigin: center ? "center" : "left center", maxWidth: L.portrait ? L.innerW : L.innerW * 0.82, textAlign: center ? "center" : "left" }}>
        {lines.map((ln, i) => (
          <div key={i} data-qa-text style={{
            fontFamily: fonts.display, fontWeight: 400, fontSize: L.size(scale), lineHeight: type.lineHeight.display,
            color: colors.ink, marginBottom: Math.round(18 * L.u), textWrap: "balance" as React.CSSProperties["textWrap"],
          }}>
            <MaskedWords text={ln.text} at={ln.at} emphasis={emphasis} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
