import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BrandLabel, CharRise, PaperGround, Rule, Script } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 5: Lesson summary, "The Index Card".
 * Bookends the course-introduction folder: a wide ruled index card rests on royal card stock.
 * Its tab carries the script heading; each takeaway is entered on a ruled line as it is spoken;
 * the card closes with the brand line and wordmark.
 */
export const SummaryLedger: React.FC<{ scene: SceneOf<"summaryLedger"> }> = ({ scene }) => {
  const { heading, sublabel, points, signoff } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const t = useNarrationTime();
  const card = useProgress(scene.startSec + 0.1, 1.4, ease.enter);
  const hold = interpolate(t, [scene.startSec + 1.5, scene.endSec], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardW = L.portrait ? L.innerW : L.width * 0.72;
  const cardH = L.portrait ? L.height * 0.7 : L.height * 0.7;
  const cardX = (L.width - cardW) / 2;
  const cardY = (L.height - cardH) / 2 + 36 * L.u;
  const tabW = Math.round(340 * L.u), tabH = Math.round(92 * L.u);
  const pad = Math.round(64 * L.u);
  const innerW = cardW - pad * 2;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.royal} deep={D.royalDeep} grain={0.11} seed={43} />
      <div style={{
        position: "absolute", left: cardX, top: cardY, width: cardW, height: cardH,
        transform: `translateY(${(1 - card) * 60 * L.u - hold * 10 * L.u}px)`, opacity: card,
      }}>
        <div style={{ position: "absolute", left: pad - 20 * L.u, top: -tabH + 2, width: tabW, height: tabH, background: P.paper, borderRadius: `${10 * L.u}px ${10 * L.u}px 0 0`, display: "flex", alignItems: "center", paddingLeft: 26 * L.u }}>
          <Script text={heading} at={scene.startSec + 0.8} size={Math.round(64 * L.u)} color={P.oxblood} dur={1.3} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: P.paper, borderRadius: 6 * L.u, boxShadow: `0 ${30 * L.u}px ${70 * L.u}px rgba(10,20,60,0.35), 0 ${4 * L.u}px ${10 * L.u}px rgba(10,20,60,0.2)`, overflow: "hidden" }}>
          <PaperGround color={P.paper} grain={0.06} seed={47} />
          {/* a thin rose margin rule, as on a ruled card */}
          <div style={{ position: "absolute", left: pad + 64 * L.u, top: 0, bottom: 0, width: 1.2, background: P.rose, opacity: 0.35 * card }} />
          <div style={{ position: "absolute", left: pad, right: pad, top: pad * 0.8 }}>
            {sublabel && <div style={{ opacity: useProgress(scene.startSec + 1.0, 1), marginBottom: 18 * L.u, paddingLeft: 92 * L.u }}><BrandLabel size={L.size("label")} color={P.royal}>{sublabel}</BrandLabel></div>}
            {points.map((pt, i) => <Row key={i} i={i} text={pt.text} at={pt.at} width={innerW} />)}
          </div>
          {signoff && (
            <div style={{ position: "absolute", left: pad, right: pad, bottom: pad * 0.7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ opacity: useProgress(signoff.at, 1.2), paddingLeft: 92 * L.u }}>
                <BrandLabel size={L.size("label")} color={D.oxbloodMuted} style={{ whiteSpace: "nowrap", letterSpacing: "0.16em" }}>{signoff.text}</BrandLabel>
              </div>
              <Script text="LifeLink" at={signoff.at + 0.5} size={Math.round(72 * L.u)} color={P.oxblood} />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ i: number; text: string; at: number; width: number }> = ({ i, text, at, width }) => {
  const L = useLayout();
  const num = useProgress(at, 0.9);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 0, padding: `${20 * L.u}px 0 ${16 * L.u}px` }}>
        <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("label") + 2, letterSpacing: "0.18em", color: P.rose, width: 92 * L.u, flexShrink: 0, opacity: num, wordSpacing: textStyle.wordSpacing }}>{String(i + 1).padStart(2, "0")}</span>
        <span style={{ fontFamily: fonts.text, fontSize: L.size("h3"), lineHeight: 1.2, color: P.oxblood, letterSpacing: "-0.005em" }}>
          <CharRise text={text} at={at + 0.1} stagger={0.016} />
        </span>
      </div>
      <Rule at={at - 0.25} length={width} color={D.hairline} dur={1.0} />
    </div>
  );
};
