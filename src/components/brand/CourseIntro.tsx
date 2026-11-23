import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { BlindEmboss, BrandLabel, CharRise, PaperGround, Rule } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Course introduction — "The Invitation". Every movement maps to the narration:
 *   • a raking light reveals the wordmark pressed into the card stock → the brand presents itself
 *   • the envelope's flap opens and a letter rises out of it          → "welcome to …": an invitation
 *   • the course title is set on the letter as it is spoken
 *   • the credit line appears when the presenter names it
 * Nothing moves without a reason; once settled, the frame is still.
 */
export const CourseIntro: React.FC<{ scene: SceneOf<"courseIntro"> }> = ({ scene }) => {
  const { courseLabel, courseTitle, lessonLabel, lessonTitle, at, titleAt, credit } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const light = useProgress(at, 2.4, ease.settle);
  const flap = useProgress(at + 0.3, 0.9, ease.settle);           // 0 closed → 1 open
  const rise = useProgress(at + 1.0, 2.0, ease.settle);            // letter rises out of the envelope
  const tAt = titleAt ?? at + 2.0;

  // geometry (px)
  const cardW = Math.round(L.width * 0.42), cardH = Math.round(L.height * 0.5);
  const envW = Math.round(cardW * 1.14), envH = Math.round(L.height * 0.42);
  const envX = L.width - L.safeX - envW;
  const openY = L.height - envH * 0.6;                              // envelope opening line
  const cardX = envX + (envW - cardW) / 2;
  const tabH0 = Math.round(64 * L.u);
  const cardTopFinal = openY - cardH * 0.94, cardTopStart = openY + tabH0 + 40 * L.u; // starts fully inside, tab included
  const cardTop = cardTopStart + (cardTopFinal - cardTopStart) * rise;
  const tabW = Math.round(240 * L.u), tabH = Math.round(64 * L.u);
  const pad = Math.round(52 * L.u);
  const notch = envH * 0.4;                                          // depth of the pocket's V
  const flapScale = 1 - 2 * flap;                                    // 1 = closed (down), -1 = open (up)
  const wordX = envX / 2, wordY = L.height * 0.46;

  const Flap = () => (
    <path d={`M${envX},${openY} L${envX + envW / 2},${openY + envH * 0.48} L${envX + envW},${openY} Z`}
      fill={flapScale > 0 ? D.paperLight : D.paperShade} stroke={D.hairline} strokeWidth={1}
      transform={`translate(0 ${openY}) scale(1 ${flapScale.toFixed(3)}) translate(0 ${-openY})`} />
  );

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.royal} deep={D.royalDeep} grain={0.11} seed={5} />
      <BlindEmboss light="rgba(255,255,255,0.30)" shadow="rgba(8,20,60,0.55)" face={P.royal} reveal={light} depth={3}>
        {(c) => (
          <div style={{ position: "absolute", left: wordX, top: wordY, transform: "translate(-50%, -50%)", fontFamily: fonts.script, fontSize: Math.round(200 * L.u), color: c, whiteSpace: "nowrap", lineHeight: 1 }}>LifeLink</div>
        )}
      </BlindEmboss>
      {credit && (
        <div style={{ position: "absolute", left: wordX, top: wordY + 130 * L.u, transform: "translateX(-50%)", textAlign: "center", opacity: useProgress(credit.at, 1.0) }}>
          {/* "Brought to you by X" → small tracked lead-in + name, kept inside the safe area */}
          <BrandLabel size={L.size("label")} color={P.sky}>{credit.text.replace(/^(brought to you by)\s+.*/i, "$1")}</BrandLabel>
          <div data-qa-text="" style={{ marginTop: 8 * L.u, fontFamily: fonts.text, fontSize: L.size("body") - 4, color: P.paper, whiteSpace: "nowrap" }}>{credit.text.replace(/^brought to you by\s+/i, "")}</div>
        </div>
      )}

      {/* envelope back + open flap (behind the letter) */}
      <svg width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <defs><filter id={`env-sh-${scene.id}`} filterUnits="userSpaceOnUse" x="0" y="0" width={L.width} height={L.height}><feDropShadow dx="0" dy={16 * L.u} stdDeviation={18 * L.u} floodColor="#0a1440" floodOpacity="0.35" /></filter></defs>
        <rect x={envX} y={openY} width={envW} height={envH} fill={D.hairline} filter={`url(#env-sh-${scene.id})`} />
        {flapScale <= 0 && <Flap />}
      </svg>

      {/* the letter */}
      <div style={{ position: "absolute", left: cardX, top: cardTop, width: cardW, height: cardH }}>
        <div style={{ position: "absolute", left: 0, top: -tabH + 2, width: tabW, height: tabH, background: P.paper, borderRadius: `${10 * L.u}px ${10 * L.u}px 0 0`, display: "flex", alignItems: "center", paddingLeft: 24 * L.u }}>
          <div style={{ opacity: Math.min(1, Math.max(0, (rise - 0.35) * 4)) }}><BrandLabel size={L.size("label")} color={P.royal}>{lessonLabel}</BrandLabel></div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: P.paper, borderRadius: `0 ${6 * L.u}px ${6 * L.u}px ${6 * L.u}px`, boxShadow: `0 ${8 * L.u}px ${24 * L.u}px rgba(10,20,60,0.25)` }}>
          <PaperGround color={P.paper} grain={0.06} seed={9} />
          {/* the letter's text exists only once the letter has emerged from the envelope */}
          <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: Math.min(1, Math.max(0, (rise - 0.35) * 4)) }}>
            <div>
              <div style={{ opacity: useProgress(tAt - 0.4, 0.8) }}><BrandLabel size={L.size("label")} color={D.oxbloodMuted}>{courseLabel}</BrandLabel></div>
              <div style={{ marginTop: 20 * L.u, fontFamily: fonts.text, fontSize: courseTitle.length > 18 ? L.size("h1") : L.size("hero") - 12, lineHeight: 1.0, color: P.oxblood, letterSpacing: "-0.015em" }}>
                <CharRise text={courseTitle} at={tAt} stagger={0.022} />
              </div>
            </div>
            <div>
              <Rule at={tAt + 0.9} length={cardW - pad * 2} color={D.hairline} />
              <div style={{ marginTop: 22 * L.u, opacity: useProgress(tAt + 1.3, 1.0) }}>
                <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: L.size("h3"), color: P.oxblood, wordSpacing: textStyle.wordSpacing }}>{lessonTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* envelope front pocket (in front of the letter), and the flap while still closed */}
      <svg width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${envX},${openY} L${envX + envW / 2},${openY + notch} L${envX + envW},${openY} L${envX + envW},${openY + envH} L${envX},${openY + envH} Z`} fill={P.paper} />
        <path d={`M${envX},${openY} L${envX + envW / 2},${openY + notch} L${envX + envW},${openY}`} fill="none" stroke={D.hairline} strokeWidth={1.5} />
        <path d={`M${envX},${openY + envH} L${envX + envW * 0.42},${openY + notch * 0.92} M${envX + envW},${openY + envH} L${envX + envW * 0.58},${openY + notch * 0.92}`} fill="none" stroke={D.hairline} strokeWidth={1} opacity={0.7} />
        {flapScale > 0 && <Flap />}
      </svg>
    </AbsoluteFill>
  );
};
