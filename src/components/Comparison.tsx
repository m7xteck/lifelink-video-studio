import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, type } from "../brand/tokens";
import { DrawLine, SoftReveal } from "../motion/Primitives";
import { useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/** Two ways of responding, side by side (stacked in portrait). The preferred one comes into focus last. */
export const Comparison: React.FC<{ scene: SceneOf<"comparison"> }> = ({ scene }) => {
  const { left, right, preferred } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const focusAt = Math.max(left.at, right.at) + 1.6;
  const focus = useProgress(focusAt, 1.0);
  const dimOf = (side: "left" | "right") => (preferred === "none" || preferred === side ? 1 : 1 - 0.45 * focus);
  const dividerLen = L.portrait ? L.innerW : L.innerH * 0.7;

  const Col: React.FC<{ side: "left" | "right"; data: typeof left }> = ({ side, data }) => (
    <div style={{ flex: 1, opacity: dimOf(side), padding: L.portrait ? `${30 * L.u}px 0` : `0 ${60 * L.u}px` }}>
      <SoftReveal at={data.at} rise={10}>
        <div data-qa-text style={{ fontFamily: fonts.display, fontSize: L.size("h2"), lineHeight: type.lineHeight.display, color: preferred === side ? colors.accent : colors.ink }}>{data.title}</div>
      </SoftReveal>
      <div style={{ marginTop: 30 * L.u }}>
        {data.points.map((pt, i) => (
          <SoftReveal key={i} at={data.at + 0.5 + i * 0.35} rise={8} dur={0.8}>
            <div style={{ display: "flex", gap: 18 * L.u, alignItems: "baseline", marginBottom: 16 * L.u }}>
              <span style={{ width: 14 * L.u, height: 2, background: side === preferred ? colors.accent : colors.inkMuted, flexShrink: 0, transform: `translateY(-${8 * L.u}px)` }} />
              <span data-qa-text style={{ fontFamily: fonts.text, fontSize: L.size("body"), lineHeight: type.lineHeight.text, color: colors.ink }}>{pt}</span>
            </div>
          </SoftReveal>
        ))}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: env.opacity, padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: L.portrait ? "column" : "row", alignItems: L.portrait ? "stretch" : "center" }}>
        <Col side="left" data={left} />
        <DrawLine at={scene.startSec + 0.2} length={dividerLen} vertical={!L.portrait} color={colors.line} />
        <Col side="right" data={right} />
      </div>
    </AbsoluteFill>
  );
};
