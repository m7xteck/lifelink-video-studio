import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, fonts, motion, textStyle, type } from "../brand/tokens";
import { BrandLabel, InkWipe, LogoMark, PaperGround, SCRIPT_INLINE_EM, avoidScript } from "../motion/brand";
import { APPROVED_OPENING_END_SEC, useLeadIn, useProgress, useSceneEnvelope } from "../motion/time";
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
  const { lines, emphasis, align, scale, kicker, signoffLogo } = scene.props;
  // Entrance style varies so consecutive statements don't all "drop up" the same way (client feedback v003).
  // Explicit `reveal` wins; otherwise picked deterministically from the scene id.
  const reveal = scene.props.reveal ?? REVEALS[[...scene.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % REVEALS.length];
  const L = useLayout();
  const env = useSceneEnvelope();
  const center = align === "center";
  // no blank seconds: the first element (kicker, else the first line) enters with the narrator's first words of the scene
  const kickerAt = useLeadIn(scene, kicker?.at ?? scene.startSec, { opener: true });
  const line0At = useLeadIn(scene, lines[0]?.at ?? scene.startSec);
  const kickerP = useProgress(kickerAt, 0.9);
  const lineAt = (i: number) => (i === 0 && !kicker ? line0At : lines[i].at);
  const emphAll = new Set(emphasis.flatMap((e) => e.split(/\s+/)).map(norm)); // phrases like "most important" mark each word
  // Script only for content words; short words and negations take the accent colour in the text face instead
  const emph = new Set([...emphAll].filter((w) => !avoidScript(w)));
  const accent = new Set([...emphAll].filter((w) => avoidScript(w)));
  const sStyle: React.CSSProperties = { ...scriptStyle, fontSize: scene.startSec < APPROVED_OPENING_END_SEC ? "1.12em" : SCRIPT_INLINE_EM };
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
              {reveal === "ink" ? (
                // the whole line is written left to right, one continuous stroke of ink
                <InkWipe at={lineAt(i)} dur={Math.max(0.9, ln.text.split(/\s+/).length * motion.wordStaggerSec * 1.8)}>
                  {ln.text.split(/\s+/).filter(Boolean).map((w, wi, arr) => (
                    <React.Fragment key={wi}>
                      {emph.has(norm(w)) ? <span style={sStyle}>{w}</span> : accent.has(norm(w)) ? <span style={{ color: P.royal }}>{w}</span> : w}
                      {wi < arr.length - 1 ? " " : null}
                    </React.Fragment>
                  ))}
                </InkWipe>
              ) : ln.text.split(/\s+/).filter(Boolean).map((w, wi, arr) => {
                const at = lineAt(i) + wi * motion.wordStaggerSec;
                const color = accent.has(norm(w)) ? P.royal : undefined;
                return (
                  <React.Fragment key={wi}>
                    {emph.has(norm(w)) ? <ScriptWord at={at} size={sStyle.fontSize as string}>{w}</ScriptWord> : reveal === "focus" ? <FocusWord at={at} color={color}>{w}</FocusWord> : <RiseWord at={at} color={color}>{w}</RiseWord>}
                    {wi < arr.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
          {signoffLogo && <SignoffLogo spec={signoffLogo} lastAt={lines[lines.length - 1]?.at ?? scene.startSec} center={center} />}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Closing sign-off: the client's logo under the last line, in oxblood on paper. It takes its place in the layout from
 * the start (so the lines never shift), comes into focus where it stands once the last line has been spoken, and then
 * holds perfectly still to the end. No movement.
 */
const SignoffLogo: React.FC<{ spec: true | { at?: number; variant: "horizontal" | "stacked" }; lastAt: number; center: boolean }> = ({ spec, lastAt, center }) => {
  const L = useLayout();
  const s = spec === true ? { variant: "horizontal" as const } : spec;
  const at = ("at" in s && s.at != null) ? s.at : lastAt + 1.3;
  const p = useProgress(at, 1.1);
  const width = Math.round((s.variant === "stacked" ? 300 : 440) * L.u);
  return (
    <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start", marginTop: Math.round(64 * L.u), opacity: p, filter: p > 0 && p < 1 ? `blur(${((1 - p) * 5).toFixed(2)}px)` : undefined }}>
      <div style={{ position: "relative" }}><LogoMark variant={s.variant} width={width} color={P.oxblood} /></div>
    </div>
  );
};

const REVEALS = ["rise", "focus", "ink"] as const;

/** Calm entrance: the word comes into focus where it stands (no movement). */
const FocusWord: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color, children }) => {
  const p = useProgress(at, motion.durationsSec.base * 1.4);
  return <span style={{ display: "inline-block", color, opacity: p, filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : undefined }}>{children}</span>;
};

/** Set type: the word rises out of a baseline mask (generous padding so nothing is clipped). */
const RiseWord: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color, children }) => {
  const p = useProgress(at, motion.durationsSec.base);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.06em 0.04em 0.14em", margin: "-0.06em -0.04em -0.14em" }}>
      <span style={{ display: "inline-block", color, transform: `translateY(${(1 - p) * 110}%)`, opacity: p < 0.02 ? 0 : 1 }}>{children}</span>
    </span>
  );
};

const scriptStyle: React.CSSProperties = { fontFamily: fonts.script, fontSize: "1.12em", color: P.royal, letterSpacing: 0, wordSpacing: "normal", lineHeight: 1 };

/** Script accent: written with an ink wipe, never masked by a box (swashes keep their full extent). */
const ScriptWord: React.FC<{ at: number; size?: string; children: React.ReactNode }> = ({ at, size = "1.12em", children }) => (
  <InkWipe at={at} dur={1.0} inline style={{ padding: "0.2em 0.22em 0.3em 0.12em", margin: "-0.2em -0.22em -0.3em -0.12em", verticalAlign: "baseline" }}>
    <span style={{ fontFamily: fonts.script, fontSize: size, color: P.royal, letterSpacing: 0, wordSpacing: "normal", lineHeight: 1 }}>{children}</span>
  </InkWipe>
);
