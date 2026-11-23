import React from "react";
import { colors, fonts, motion } from "../brand/tokens";
import { useProgress } from "./time";

/** Words rise out of a mask, staggered, starting at absolute second `at`. */
export const MaskedWords: React.FC<{
  text: string; at: number; emphasis?: string[]; style?: React.CSSProperties; emphasisStyle?: React.CSSProperties;
}> = ({ text, at, emphasis = [], style, emphasisStyle }) => {
  const words = text.split(/\s+/).filter(Boolean);
  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
  // Emphasis entries are normalised exactly like on-screen words, so "guess." matches "guess".
  const emph = new Set(emphasis.map(norm));
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((w, i) => {
        const bare = norm(w);
        const isEm = emph.has(bare);
        return (
          <React.Fragment key={i}>
            <Word at={at + i * motion.wordStaggerSec} style={isEm ? { color: colors.accent, fontFamily: fonts.script, fontSize: "1.12em", letterSpacing: 0, ...emphasisStyle } : undefined}>
              {w}
            </Word>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </span>
  );
};

const Word: React.FC<{ at: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, style, children }) => {
  const p = useProgress(at, motion.durationsSec.base);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: p < 0.02 ? 0 : 1, ...style }}>
        {children}
      </span>
    </span>
  );
};

/** Opacity + soft focus pull, for restrained moments. */
export const SoftReveal: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; rise?: number }> = ({
  at, dur = motion.durationsSec.slow, children, style, rise = 14,
}) => {
  const p = useProgress(at, dur);
  return (
    <div style={{ opacity: p, filter: `blur(${(1 - p) * 8}px)`, transform: `translateY(${(1 - p) * rise}px)`, ...style }}>{children}</div>
  );
};

/** Tracked uppercase label used for kickers and framework labels. */
export const Label: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = colors.accent, style }) => (
  <div data-qa-text style={{ fontFamily: fonts.text, fontWeight: 500, fontSize: size, letterSpacing: "0.16em", textTransform: "uppercase", color, ...style }}>
    {children}
  </div>
);

/** A hairline that draws itself. */
export const DrawLine: React.FC<{ at: number; length: number; vertical?: boolean; dur?: number; color?: string; thickness?: number; style?: React.CSSProperties }> = ({
  at, length, vertical, dur = motion.durationsSec.slow, color = colors.line, thickness = 2, style,
}) => {
  const p = useProgress(at, dur);
  return (
    <div style={{ width: vertical ? thickness : length * p, height: vertical ? length * p : thickness, background: color, ...style }} />
  );
};
