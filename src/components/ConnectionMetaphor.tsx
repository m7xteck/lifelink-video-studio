import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, ease, fonts } from "../brand/tokens";
import { Label, SoftReveal } from "../motion/Primitives";
import { lerp, useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

/**
 * Two individuals, two forms. They move toward each other when the narration
 * describes connection; the shared space between them is lit, not merged —
 * each form stays whole.
 */
export const ConnectionMetaphor: React.FC<{ scene: SceneOf<"connectionMetaphor"> }> = ({ scene }) => {
  const { leftLabel, rightLabel, sharedLabel, convergeAt, caption } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const appear = useProgress(scene.startSec + 0.2, 1.2);
  const conv = useProgress(convergeAt, 2.4, ease.settle);
  const glow = useProgress(convergeAt + 1.2, 1.6);

  const cx = L.width / 2;
  const cy = L.portrait ? L.height * 0.42 : L.height * 0.46;
  const R = Math.round((L.portrait ? 230 : 250) * L.u);
  const far = R * 1.55, near = R * 0.62;
  const off = lerp(far, near, conv);
  const lx = cx - off, rx = cx + off;
  const sw = Math.max(1.5, 2.2 * L.u);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={`clipL-${scene.id}`}><circle cx={lx} cy={cy} r={R} /></clipPath>
          <radialGradient id={`g-${scene.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.55} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0.08} />
          </radialGradient>
        </defs>
        <circle cx={rx} cy={cy} r={R} fill={`url(#g-${scene.id})`} clipPath={`url(#clipL-${scene.id})`} opacity={glow} />
        <circle cx={lx} cy={cy} r={R * (0.9 + 0.1 * appear)} fill="none" stroke={colors.secondary} strokeWidth={sw} opacity={appear} />
        <circle cx={rx} cy={cy} r={R * (0.9 + 0.1 * appear)} fill="none" stroke={colors.accent} strokeWidth={sw} opacity={appear} />
      </svg>
      <div style={{ position: "absolute", left: lx - R, width: R * 2, top: cy - 20 * L.u, textAlign: "center", opacity: appear * (1 - glow * 0.35), transform: `translateX(${-R * 0.35 * conv}px)` }}>
        <Label size={L.size("label")} color={colors.ink}>{leftLabel}</Label>
      </div>
      <div style={{ position: "absolute", left: rx - R, width: R * 2, top: cy - 20 * L.u, textAlign: "center", opacity: appear * (1 - glow * 0.35), transform: `translateX(${R * 0.35 * conv}px)` }}>
        <Label size={L.size("label")} color={colors.ink}>{rightLabel}</Label>
      </div>
      {sharedLabel && (
        <div style={{ position: "absolute", left: cx - R * 0.6, width: R * 1.2, top: cy - 22 * L.u, textAlign: "center", opacity: glow }}>
          <div data-qa-text style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: L.size("h3"), color: colors.ink }}>{sharedLabel}</div>
        </div>
      )}
      {caption && (
        <div style={{ position: "absolute", left: L.safeX, right: L.safeX, bottom: L.safeY, textAlign: "center" }}>
          <SoftReveal at={convergeAt + 1.6}>
            <div data-qa-text style={{ fontFamily: fonts.text, fontSize: L.size("body"), color: colors.inkMuted }}>{caption}</div>
          </SoftReveal>
        </div>
      )}
    </AbsoluteFill>
  );
};
