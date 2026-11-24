import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, fonts, motion, textStyle, type } from "../brand/tokens";
import { BrandLabel, InkWipe, PaperGround } from "../motion/brand";
import { useProgress, useSceneEnvelope } from "../motion/time";
import { useLayout } from "../motion/layout";
import type { SceneOf } from "../schema/manifest";

const P = brand.palette as Record<string, string>, D = brand.derived as Record<string, string>;
const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");

/**
 * A principle stated with typographic weight, in the brand "paper and ink" finish
 * (same ground, ink colour, word spacing and label as the brand scenes).
 * Each word rises as its line is spoken; emphasised words are written in script with an ink wipe.
 * No camera drift: once the last word lands, the frame is still (client rule).
 */
export const KineticStatement: React.FC<{ scene: SceneOf<"kineticStatement"> }> = ({ scene }) => {
  const { lines, emphasis, align, scale, kicker } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const center = align === "center";
  const kickerP = useProgress(kicker?.at ?? scene.startSec, 0.9);
  const emph = new Set(emphasis.flatMap((e) => e.split(/\s+/)).map(norm)); // phrases like "most important" mark each word
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={33} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: center ? "center" : "flex-start", padding: `${L.safeY}px ${L.safeX}px` }}>
        <div style={{ maxWidth: L.portrait ? L.innerW : L.innerW * 0.82, textAlign: center ? "center" : "left" }}>
          {kicker && (
            <div style={{ marginBottom: Math.round(34 * L.u), opacity: kickerP }}>
              <BrandLabel size={L.size("label")} color={P.royal}>{kicker.text}</BrandLabel>
            </div>
          )}
          {lines.map((ln, i) => (
            <div key={i} data-qa-text="" style={{
              fontFamily: fonts.text, fontWeight: 400, fontSize: L.size(scale), lineHeight: emphasis.length ? 1.22 : 1.14, // script emphasis has tall ascenders
              color: P.oxblood, wordSpacing: textStyle.wordSpacing, letterSpacing: type.letterSpacing.headline,
              marginBottom: Math.round(14 * L.u), textWrap: "balance" as React.CSSProperties["textWrap"],
            }}>
              {ln.text.split(/\s+/).filter(Boolean).map((w, wi, arr) => {
                const at = ln.at + wi * motion.wordStaggerSec;
                return (
                  <React.Fragment key={wi}>
                    {emph.has(norm(w)) ? <ScriptWord at={at}>{w}</ScriptWord> : <RiseWord at={at}>{w}</RiseWord>}
                    {wi < arr.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Set type: the word rises out of a baseline mask (generous padding so nothing is clipped). */
const RiseWord: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const p = useProgress(at, motion.durationsSec.base);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.06em 0.04em 0.14em", margin: "-0.06em -0.04em -0.14em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)`, opacity: p < 0.02 ? 0 : 1 }}>{children}</span>
    </span>
  );
};

/** Script accent: written with an ink wipe, never masked by a box (swashes keep their full extent). */
const ScriptWord: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => (
  <InkWipe at={at} dur={1.0} inline style={{ padding: "0.2em 0.22em 0.3em 0.12em", margin: "-0.2em -0.22em -0.3em -0.12em", verticalAlign: "baseline" }}>
    <span style={{ fontFamily: fonts.script, fontSize: "1.12em", color: P.royal, letterSpacing: 0, wordSpacing: "normal", lineHeight: 1 }}>{children}</span>
  </InkWipe>
);
