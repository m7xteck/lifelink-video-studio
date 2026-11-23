import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, type } from "../brand/tokens";
import { DrawLine, Label, MaskedWords } from "../motion/Primitives";
import { useCameraDrift, useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/** Editorial chapter opener: oversized outlined numeral, tracked kicker, drawn rule, serif title. */
export const SectionTitle: React.FC<{ scene: SceneOf<"sectionTitle"> }> = ({ scene }) => {
  const { startSec } = scene;
  const { index, title, kicker } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const drift = useCameraDrift(1.02);
  const numP = useProgress(startSec, 1.6);
  const num = index !== undefined ? String(index).padStart(2, "0") : null;
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      {num && (
        <div style={{
          position: "absolute", right: L.portrait ? L.safeX : L.safeX * 0.6, top: L.portrait ? L.safeY : "50%",
          transform: `translateY(${L.portrait ? 0 : -50}%) translateX(${(1 - numP) * 40}px)`,
          fontFamily: fonts.display, fontSize: Math.round(520 * L.u), lineHeight: 1, opacity: 0.55 * numP,
          color: "transparent", WebkitTextStroke: `${Math.max(1, 1.5 * L.u)}px ${colors.accentSoft}`,
        }}>{num}</div>
      )}
      <AbsoluteFill style={{ justifyContent: L.portrait ? "flex-end" : "center", padding: `${L.safeY}px ${L.safeX}px`, paddingBottom: L.portrait ? L.safeY * 2 : L.safeY }}>
        <div style={{ transform: `scale(${drift})`, transformOrigin: "left center", maxWidth: L.portrait ? L.innerW : L.innerW * 0.58 }}>
          <Label size={L.size("label")}>{kicker ?? (num ? `Section ${num}` : "Section")}</Label>
          <DrawLine at={startSec + 0.2} length={Math.round(160 * L.u)} color={colors.accent} style={{ margin: `${Math.round(28 * L.u)}px 0 ${Math.round(34 * L.u)}px` }} />
          <div data-qa-text style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: L.size("hero"), lineHeight: type.lineHeight.display, color: colors.ink }}>
            <MaskedWords text={title} at={startSec + 0.35} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
