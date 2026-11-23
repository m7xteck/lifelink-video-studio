import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ease, fonts, motion, textStyle, texture } from "../brand/tokens";
import { useProgress } from "./time";

/**
 * Brand motifs for the LifeLink proposal: "paper and ink".
 * Paper grounds, ink-wipe script, letterpress character rise, blind emboss,
 * and the link-rings device. All colours come from tokens via props.
 */

/**
 * Textured paper/card ground. `deep` adds a soft vignette toward the given colour.
 * Grain and fibre textures are pre-rendered once (public/textures, generated from the same SVG
 * turbulence filters) instead of being recomputed every frame: identical look, far faster renders.
 * `seed` offsets the texture so adjacent grounds don't share an identical pattern.
 */
export const PaperGround: React.FC<{ color: string; deep?: string; grain?: number; seed?: number }> = ({ color, deep, grain = texture.paperGrainOpacity, seed = 3 }) => {
  // <Img> (not CSS backgrounds) so Remotion waits for the texture before capturing any frame.
  const flip = `scale(${seed % 2 ? -1 : 1}, ${Math.floor(seed / 2) % 2 ? -1 : 1})`;
  const img: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "multiply", transform: flip };
  return (
    <AbsoluteFill style={{ background: color }}>
      {deep && <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 75% at 45% 45%, transparent 40%, ${deep} 100%)`, opacity: 0.55 }} />}
      <Img src={staticFile("textures/paper-grain.png")} style={{ ...img, opacity: grain }} />
      <Img src={staticFile("textures/paper-fibre.png")} style={{ ...img, opacity: grain * 0.9 }} />
    </AbsoluteFill>
  );
};

/** Ink wipe: content is revealed left→right with a soft leading edge, like a pen stroke. */
export const InkWipe: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; inline?: boolean }> = ({ at, dur = 1.1, children, style, inline }) => {
  const p = useProgress(at, dur, ease.settle);
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge + 3}%)`;
  return (
    <div style={{ display: inline ? "inline-block" : "block", WebkitMaskImage: mask, maskImage: mask, opacity: p > 0 ? 1 : 0, ...style }}>
      {children}
    </div>
  );
};

/** Letterpress: each character rises from its baseline mask, staggered. */
export const CharRise: React.FC<{ text: string; at: number; stagger?: number; style?: React.CSSProperties; qa?: boolean }> = ({ text, at, stagger = 0.028, style, qa = true }) => {
  const words = text.split(" ");
  let idx = 0;
  return (
    <span data-qa-text={qa ? "" : undefined} style={{ display: "inline", wordSpacing: textStyle.wordSpacing, ...style }}>
      {words.map((w, wi) => (
        <React.Fragment key={wi}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {[...w].map((ch) => <Char key={idx} ch={ch} at={at + idx++ * stagger} />)}
          </span>
          {wi < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </span>
  );
};
const Char: React.FC<{ ch: string; at: number }> = ({ ch, at }) => {
  const p = useProgress(at, motion.durationsSec.base);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)` }}>{ch}</span>
    </span>
  );
};

/** Script word/phrase, revealed with ink. Use for ≤ 4 words only (brand rule). */
export const Script: React.FC<{ text: string; at: number; size: number; color: string; dur?: number; style?: React.CSSProperties; overlapOk?: boolean; knockout?: string }> = ({ text, at, size, color, dur, style, overlapOk, knockout }) => (
  <InkWipe at={at} dur={dur ?? Math.min(1.8, 0.6 + text.length * 0.07)} inline style={style}>
    <span data-qa-text="" data-qa-overlap-ok={overlapOk ? "" : undefined} style={{
      fontFamily: fonts.script, fontSize: size, color, lineHeight: 1.25, whiteSpace: "nowrap", wordSpacing: "normal", display: "inline-block", padding: "0.1em 0.18em 0.2em 0.05em",
      // knock-out: a thin halo in the ground colour where script crosses other type (editorial convention)
      textShadow: knockout ? [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `${(Math.cos((a * Math.PI) / 180) * size * 0.035).toFixed(1)}px ${(Math.sin((a * Math.PI) / 180) * size * 0.035).toFixed(1)}px 0 ${knockout}`).join(", ") : undefined,
    }}>
      {text}
    </span>
  </InkWipe>
);

/** Two interlocking hairline rings that draw themselves. The brand "link" device (not the logo). */
export const LinkRings: React.FC<{
  cx: number; cy: number; r: number; gap?: number; at: number; dur?: number;
  colorA: string; colorB: string; stroke?: number; fillShared?: string; sharedAt?: number;
}> = ({ cx, cy, r, gap = 0.62, at, dur = 1.8, colorA, colorB, stroke = 2, fillShared, sharedAt }) => {
  const pA = useProgress(at, dur, ease.settle);
  const pB = useProgress(at + dur * 0.35, dur, ease.settle);
  const pS = useProgress(sharedAt ?? at + dur, 1.2);
  const ax = cx - r * gap, bx = cx + r * gap;
  const id = `lr-${Math.round(cx)}-${Math.round(cy)}`;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width="100%" height="100%">
      <defs><clipPath id={id}><circle cx={ax} cy={cy} r={r} /></clipPath></defs>
      {fillShared && <circle cx={bx} cy={cy} r={r} fill={fillShared} clipPath={`url(#${id})`} opacity={pS} />}
      <circle cx={ax} cy={cy} r={r} fill="none" stroke={colorA} strokeWidth={stroke} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pA} transform={`rotate(-90 ${ax} ${cy})`} />
      <circle cx={bx} cy={cy} r={r} fill="none" stroke={colorB} strokeWidth={stroke} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pB} transform={`rotate(90 ${bx} ${cy})`} />
    </svg>
  );
};

/** Blind emboss: shape in the ground colour, revealed by a raking light (highlight + shadow). */
export const BlindEmboss: React.FC<{ children: (stroke: string) => React.ReactNode; light: string; shadow: string; face: string; reveal: number; depth?: number }> = ({ children, light, shadow, face, reveal, depth = texture.embossDepthPx }) => (
  <div style={{ position: "absolute", inset: 0, filter: "blur(0.6px)" }}>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${-depth}px, ${-depth}px)`, opacity: reveal }}>{children(light)}</div>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${depth}px, ${depth}px)`, opacity: reveal }}>{children(shadow)}</div>
    {/* the raised face, in the ground colour: what makes it read as pressed paper rather than a drawn line */}
    <div style={{ position: "absolute", inset: 0 }}>{children(face)}</div>
  </div>
);

/** Hairline that draws (horizontal or vertical). */
export const Rule: React.FC<{ at: number; length: number; color: string; vertical?: boolean; thickness?: number; dur?: number; style?: React.CSSProperties }> = ({ at, length, color, vertical, thickness = 1.5, dur = 1.2, style }) => {
  const p = useProgress(at, dur, ease.settle);
  return <div style={{ width: vertical ? thickness : length * p, height: vertical ? length * p : thickness, background: color, ...style }} />;
};

/** Tracked label in the text face. */
export const BrandLabel: React.FC<{ children: React.ReactNode; size: number; color: string; style?: React.CSSProperties }> = ({ children, size, color, style }) => (
  <span data-qa-text="" style={{ fontFamily: fonts.text, fontSize: size, letterSpacing: "0.22em", textTransform: "uppercase", color, wordSpacing: textStyle.wordSpacing, display: "inline-block", ...style }}>{children}</span>
);
