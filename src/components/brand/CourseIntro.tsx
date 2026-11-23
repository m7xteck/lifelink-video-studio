import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BlindEmboss, BrandLabel, CharRise, PaperGround, Rule } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 1: Course introduction, "The Folder".
 * Royal-blue textured card stock; the link rings are blind-embossed and revealed by a raking
 * light. A cream index card slides up like a document from a folder; the wordmark sits on its tab.
 */
export const CourseIntro: React.FC<{ scene: SceneOf<"courseIntro"> }> = ({ scene }) => {
  const { courseLabel, courseTitle, lessonLabel, lessonTitle, at } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const t = useNarrationTime();
  const light = useProgress(at, 2.6, ease.settle);
  const sweep = interpolate(t, [at, at + 3.2, at + 3.21, scene.endSec], [-30, 130, -40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hold = interpolate(t, [at + 2.4, scene.endSec], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Short, eased travel + fade: never a long fast slide (judders at 30 fps). See motion rule in design system.
  const card = useProgress(at + 0.8, 1.8, ease.settle);
  const cardFade = useProgress(at + 0.8, 0.8, ease.settle);

  const cardW = L.portrait ? L.innerW : L.width * 0.47;
  const cardH = L.portrait ? L.height * 0.42 : L.height * 0.54;
  const cardX = L.portrait ? L.safeX : L.width - L.safeX - cardW;
  const cardY = L.portrait ? L.height * 0.46 : (L.height - cardH) / 2 + 30 * L.u;
  const tabW = Math.round(260 * L.u), tabH = Math.round(70 * L.u);
  const ringsCx = L.portrait ? L.width / 2 : cardX / 2; // centred in the open field left of the card
  const ringsCy = L.portrait ? L.height * 0.24 : L.height * 0.5;
  const R = Math.round((L.portrait ? 190 : 210) * L.u);
  const pad = Math.round(56 * L.u);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.royal} deep={D.royalDeep} grain={0.11} seed={5} />
      {/* raking light across the card stock */}
      <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent ${sweep - 25}%, rgba(255,255,255,0.10) ${sweep}%, transparent ${sweep + 25}%)` }} />
      {/* blind-embossed wordmark: pressed into the card stock, revealed by the raking light */}
      <BlindEmboss light="rgba(255,255,255,0.30)" shadow="rgba(8,20,60,0.55)" face={P.royal} reveal={light} depth={3}>
        {(c) => (
          <div style={{ position: "absolute", left: ringsCx, top: ringsCy, transform: "translate(-50%, -50%)", fontFamily: fonts.script, fontSize: Math.round((L.portrait ? 190 : 220) * L.u), color: c, whiteSpace: "nowrap", lineHeight: 1 }}>LifeLink</div>
        )}
      </BlindEmboss>

      {/* the index card */}
      <div style={{
        position: "absolute", left: cardX, top: cardY, width: cardW, height: cardH,
        transform: `translateY(${(1 - card) * 120 * L.u - hold * 14 * L.u}px)`,
        opacity: cardFade,
      }}>
        <div style={{ position: "absolute", left: 0, top: -tabH + 2, width: tabW, height: tabH, background: P.paper, borderRadius: `${10 * L.u}px ${10 * L.u}px 0 0`, display: "flex", alignItems: "center", paddingLeft: 26 * L.u }}>
          <div style={{ opacity: useProgress(at + 2.0, 0.9) }}><BrandLabel size={L.size("label")} color={P.royal}>{lessonLabel}</BrandLabel></div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: P.paper, borderRadius: `0 ${6 * L.u}px ${6 * L.u}px ${6 * L.u}px`, boxShadow: `0 ${30 * L.u}px ${60 * L.u}px rgba(10,20,60,0.35), 0 ${4 * L.u}px ${10 * L.u}px rgba(10,20,60,0.2)` }}>
          <PaperGround color={P.paper} grain={0.06} seed={9} />
          <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <BrandLabel size={L.size("label")} color={D.oxbloodMuted}>{courseLabel}</BrandLabel>
              <div style={{ marginTop: 22 * L.u, fontFamily: fonts.text, fontSize: courseTitle.length > 18 ? L.size("h1") : L.size("hero") - 12, lineHeight: 1.0, color: P.oxblood, letterSpacing: "-0.015em" }}>
                <CharRise text={courseTitle} at={at + 1.9} stagger={0.022} />
              </div>
            </div>
            <div>
              <Rule at={at + 2.6} length={cardW - pad * 2} color={D.hairline} />
              <div style={{ marginTop: 26 * L.u, opacity: useProgress(at + 2.9, 1.0) }}>
                <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("h3"), color: P.oxblood, wordSpacing: textStyle.wordSpacing }}>{lessonTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
