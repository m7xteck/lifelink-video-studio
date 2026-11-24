import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, colors, fonts } from "../brand/tokens";
import { SoftReveal } from "../motion/Primitives";
import { PaperGround } from "../motion/brand";
import { useLeadIn, useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/**
 * For emotionally weighted moments: almost still, generous space, minimal text.
 * On its own paper ground (so hand-offs from a coloured ground never show through).
 * No blank opening (v004 review): if the text's cue is well after the narrator starts, the first element enters with the
 * narrator's first words. When there is an attribution, that first element is the ATTRIBUTION ("Prophet Muhammad (peace and
 * blessings be upon him)" appears as the name is spoken), and the text then surfaces above it on its own cue.
 * `attributionAt` sets the attribution's cue explicitly (before or after the text).
 */
export const QuietReflection: React.FC<{ scene: SceneOf<"quietReflection"> }> = ({ scene }) => {
  const { text, attribution, attributionAt } = scene.props;
  const cue = scene.props.at ?? scene.startSec + 0.4;
  const lead = useLeadIn(scene, cue);
  const attrFirst = !!attribution && (attributionAt != null ? attributionAt < cue : lead < cue);
  const at = attrFirst ? cue : lead;
  const attrAt = attributionAt ?? (attrFirst ? lead : at + 1.6);
  const L = useLayout();
  const env = useSceneEnvelope();
  const dot = useProgress(attrFirst ? attrAt + 0.3 : at + 1.2, 1.4);
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={37} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `${L.safeY}px ${L.safeX * 1.6}px` }}>
        <SoftReveal at={at} dur={1.8} rise={6}>
          <div data-qa-text style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: L.size("h2"), lineHeight: 1.25, color: colors.ink, textAlign: "center", maxWidth: L.portrait ? L.innerW : L.innerW * 0.62, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
            {text}
          </div>
        </SoftReveal>
        <div style={{ marginTop: Math.round(44 * L.u), width: 8 * L.u, height: 8 * L.u, borderRadius: 99, background: colors.accent, opacity: dot, transform: `scale(${0.4 + dot * 0.6})` }} />
        {attribution && (
          <SoftReveal at={attrAt} dur={attrFirst ? 1.0 : undefined}>
            <div data-qa-text style={{ marginTop: Math.round(26 * L.u), fontFamily: fonts.text, fontSize: attrFirst ? L.size("body") : L.size("label"), color: colors.inkMuted, letterSpacing: "0.04em", textAlign: "center" }}>{attribution}</div>
          </SoftReveal>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
