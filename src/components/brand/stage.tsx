import React from "react";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useProgress } from "../../motion/time";

/**
 * Shared helpers for the variety-v2 signature components that mix HTML type with paper shapes.
 * <Stage/> is a fixed 1920×1080 artboard scaled to fit (meet), so HTML and SVG share one coordinate space.
 */
export const P = brand.palette;
export const D = brand.derived as Record<string, string>;
export const SHADOW_1 = "drop-shadow(0px 6px 8px rgba(26,10,10,0.17))";
export const SHADOW_2 = "drop-shadow(0px 9px 12px rgba(26,10,10,0.22))";

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const L = useLayout();
  const s = Math.min(L.width / 1920, L.height / 1080);
  return (
    <div style={{ position: "absolute", left: (L.width - 1920 * s) / 2, top: (L.height - 1080 * s) / 2, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  );
};

/** Largest size ≤ max at which `text` fits `maxW` on one line (average glyph ≈ em × size). */
export const fit1 = (text: string, max: number, maxW: number, min = 22, em = 0.56) => Math.max(min, Math.min(max, Math.floor(maxW / Math.max(1, text.length * em))));

/** Largest size from `sizes` at which `text` wraps into ≤ maxLines lines of width maxW (with wrap slack). */
export const fitLines = (text: string, sizes: number[], maxW: number, maxLines: number, em = 0.56) => {
  for (const s of sizes) if (Math.ceil((text.length * em * s) / (maxW * 0.86)) <= maxLines) return s;
  return sizes[sizes.length - 1];
};

/** Text face style (single weight; corrected word spacing). */
export const txt = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: fonts.text, fontSize: size, color, wordSpacing: textStyle.wordSpacing, lineHeight: 1.22, ...extra,
});

/** Tracked small caps label in the text face. */
export const tracked = (size: number, color: string): React.CSSProperties => ({
  fontFamily: fonts.text, fontSize: size, color, letterSpacing: "0.22em", textTransform: "uppercase", wordSpacing: textStyle.wordSpacing, whiteSpace: "nowrap",
});

/** Comes into focus in place (no travel): opacity + blur. */
export const FocusIn: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = 1.2, children, style }) => {
  const p = useProgress(at, dur, ease.settle);
  if (p <= 0) return null;
  return <div style={{ opacity: p, filter: p < 1 ? `blur(${((1 - p) * 7).toFixed(2)}px)` : undefined, ...style }}>{children}</div>;
};

/** Ink: written left→right with a soft leading edge. Renders nothing before `at`. */
export const Ink: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = 1.0, children, style }) => {
  const p = useProgress(at, dur, ease.settle);
  if (p <= 0) return null;
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge + 3}%)`;
  return <div style={{ WebkitMaskImage: p < 1 ? mask : undefined, maskImage: p < 1 ? mask : undefined, ...style }}>{children}</div>;
};

/** Ink duration that scales with text length. */
export const inkDur = (text: string) => Math.min(1.5, 0.5 + text.length * 0.035);

/** Script accent (≤ 4 words; brand rule), inked. Script's space glyph is near zero: words get an explicit gap. */
export const ScriptWord: React.FC<{ text: string; at: number; size: number; color: string; style?: React.CSSProperties }> = ({ text, at, size, color, style }) => (
  <Ink at={at} dur={Math.min(1.6, 0.6 + text.length * 0.07)} style={style}>
    <span data-qa-text="" style={{ fontFamily: fonts.script, fontSize: size, color, lineHeight: 1.25, whiteSpace: "nowrap", display: "inline-block", padding: "0.08em 0.2em 0.18em 0.04em" }}>
      {text.split(" ").map((w, i) => <span key={i} style={{ marginLeft: i ? size * 0.28 : 0 }}>{w}</span>)}
    </span>
  </Ink>
);
