import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, type } from "../brand/tokens";
import { DrawLine, Label, MaskedWords } from "../motion/Primitives";
import { useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/** Recap: points accumulate as they are spoken, each anchored by a drawn rule. */
export const Takeaway: React.FC<{ scene: SceneOf<"takeaway"> }> = ({ scene }) => {
  const { heading, points } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const head = useProgress(scene.startSec + 0.1, 0.9);
  return (
    <AbsoluteFill style={{ opacity: env.opacity, padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: L.portrait ? "column" : "row", gap: 80 * L.u }}>
        <div style={{ width: L.portrait ? "auto" : L.innerW * 0.3, opacity: head }}>
          <Label size={L.size("label")}>Remember</Label>
          <div data-qa-text style={{ marginTop: 18 * L.u, fontFamily: fonts.display, fontSize: L.size("h1"), lineHeight: type.lineHeight.display, color: colors.ink }}>{heading}</div>
        </div>
        <div style={{ flex: 1 }}>
          {points.map((p, i) => (
            <Point key={i} i={i} p={p} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Point: React.FC<{ i: number; p: { text: string; at: number } }> = ({ i, p }) => {
  const L = useLayout();
  const num = useProgress(p.at - 0.1, 0.6);
  return (
            <div style={{ marginBottom: 34 * L.u }}>
              <DrawLine at={p.at - 0.2} length={L.portrait ? L.innerW : L.innerW * 0.6} color={colors.line} dur={0.9} style={{ marginBottom: 20 * L.u }} />
              <div style={{ display: "flex", gap: 26 * L.u, alignItems: "baseline" }}>
                <span style={{ fontFamily: fonts.display, fontSize: L.size("h3"), color: colors.accent, minWidth: 40 * L.u, opacity: num }}>{String(i + 1).padStart(2, "0")}</span>
                <span data-qa-text style={{ fontFamily: fonts.text, fontWeight: 500, fontSize: L.size("body") + 2, lineHeight: type.lineHeight.text, color: colors.ink }}>
                  <MaskedWords text={p.text} at={p.at} />
                </span>
              </div>
            </div>
  );
};
