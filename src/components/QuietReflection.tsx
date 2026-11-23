import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, type } from "../brand/tokens";
import { SoftReveal } from "../motion/Primitives";
import { useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/** For emotionally weighted moments: almost still, generous space, minimal text. */
export const QuietReflection: React.FC<{ scene: SceneOf<"quietReflection"> }> = ({ scene }) => {
  const { text, attribution } = scene.props;
  const at = scene.props.at ?? scene.startSec + 0.4;
  const L = useLayout();
  const env = useSceneEnvelope();
  const dot = useProgress(at + 1.2, 1.4);
  return (
    <AbsoluteFill style={{ opacity: env.opacity, justifyContent: "center", alignItems: "center", padding: `${L.safeY}px ${L.safeX * 1.6}px` }}>
      <SoftReveal at={at} dur={1.8} rise={6}>
        <div data-qa-text style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: L.size("h2"), lineHeight: 1.25, color: colors.ink, textAlign: "center", maxWidth: L.portrait ? L.innerW : L.innerW * 0.62, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          {text}
        </div>
      </SoftReveal>
      <div style={{ marginTop: Math.round(44 * L.u), width: 8 * L.u, height: 8 * L.u, borderRadius: 99, background: colors.accent, opacity: dot, transform: `scale(${0.4 + dot * 0.6})` }} />
      {attribution && (
        <SoftReveal at={at + 1.6}>
          <div data-qa-text style={{ marginTop: Math.round(26 * L.u), fontFamily: fonts.text, fontSize: L.size("label"), color: colors.inkMuted, letterSpacing: "0.06em" }}>{attribution}</div>
        </SoftReveal>
      )}
    </AbsoluteFill>
  );
};
