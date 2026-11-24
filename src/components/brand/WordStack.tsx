import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { PaperGround } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;
const TABS = [P.royal, P.sky, P.rose, D.royalDeep];

/**
 * "Word stack": 2–4 key words (a list of qualities) set as they are spoken. Three art-directed layouts
 * (optional `variant`; omitted = picked deterministically from the scene id):
 *  - "column": the stack below.
 *  - "row": one paper band set across the frame; the words sit in equal cells divided by ruled lines that
 *    draw down as each word arrives; the lead sits above the band.
 *  - "offset": staggered editorial steps; each word lands on its own paper slip, an ink leader rule runs
 *    from the margin to it, so the cascade fills the frame diagonally.
 *
 * Column: (a list of qualities) stacked big and left-aligned. As each word is
 * spoken a small cut-paper tab lands and the word slides out from behind it; the word being spoken
 * is in full ink, words already said settle to the muted ink so the eye follows the narration.
 * An optional plain lead-in sentence sits in its own column at the left. No kicker, no rule.
 */
export const WordStack: React.FC<{ scene: SceneOf<"wordStack"> }> = ({ scene }) => {
  const L = useLayout();
  const v = scene.props.variant ?? VARIANTS[hashId(scene.id) % VARIANTS.length];
  // the two editorial variants are composed for landscape; portrait keeps the proven column stack
  if (v === "row" && !L.portrait) return <RowStack scene={scene} />;
  if (v === "offset") return <OffsetStack scene={scene} />;
  return <ColumnStack scene={scene} />;
};

const VARIANTS = ["column", "row", "offset"] as const;
const hashId = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** "column" (the original layout). */
const ColumnStack: React.FC<{ scene: SceneOf<"wordStack"> }> = ({ scene }) => {
  const { lead, words } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const t = useNarrationTime();
  const twoCol = !!lead && !L.portrait;
  const leadW = L.innerW * 0.34;
  const stackLeft = twoCol ? L.safeX + leadW + 90 * L.u : L.safeX;
  const stackW = L.width - stackLeft - L.safeX;
  const longest = Math.max(...words.map((w) => w.text.length));
  const tabW = 0.3; // em
  const fs = Math.round(Math.min(L.size("hero"), (L.height * 0.66) / (words.length * 1.2), stackW / ((longest + tabW / 0.56 + 1) * 0.56)));
  const current = words.reduce((c, w, i) => (t >= w.at ? i : c), -1);
  const leadP = useProgress(lead?.at ?? 0, 1.1, ease.settle);
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={61} />
      {lead && (
        <div data-qa-text="" style={{
          position: "absolute", left: L.safeX, width: twoCol ? leadW : L.innerW,
          ...(twoCol ? { top: "50%", transform: `translateY(-50%) translateY(${((1 - leadP) * 12).toFixed(1)}px)` } : { top: L.safeY + 20 * L.u, transform: `translateY(${((1 - leadP) * 12).toFixed(1)}px)` }),
          fontFamily: fonts.text, fontSize: L.size("h3"), lineHeight: 1.3, color: D.oxbloodMuted, textWrap: "balance", wordSpacing: textStyle.wordSpacing, opacity: leadP,
        }}>{lead.text}</div>
      )}
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: stackLeft, paddingRight: L.safeX, paddingTop: !twoCol && lead ? L.safeY : 0 }}>
        <div>
          {words.map((w, i) => (
            <StackWord key={i} text={w.text} at={w.at} size={fs} tab={TABS[i % TABS.length]} muted={current > i} mutedAt={words[i + 1]?.at ?? 1e9} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const StackWord: React.FC<{ text: string; at: number; size: number; tab: string; muted: boolean; mutedAt: number }> = ({ text, at, size, tab, mutedAt }) => {
  const tabP = useProgress(at - 0.2, 0.7, ease.settle);
  const p = useProgress(at, 0.9, ease.settle);
  const m = useProgress(mutedAt, 0.8, ease.settle);
  const color = mix(P.oxblood, D.oxbloodMuted, m * 0.85);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.28, height: size * 1.2 }}>
      <div style={{
        width: size * 0.3, height: size * 0.62, background: tab, borderRadius: 2, flex: "none",
        boxShadow: `0 ${(tabP * 4).toFixed(1)}px ${(tabP * 9).toFixed(1)}px rgba(26,10,10,${(0.18 * tabP).toFixed(3)})`,
        opacity: Math.min(1, tabP * 4), transform: `translateY(${((1 - tabP) * 26).toFixed(1)}px)`,
      }} />
      <div style={{ overflow: "hidden", padding: "0.1em 0.1em 0.16em 0", margin: "-0.1em -0.1em -0.16em 0" }}>
        <div data-qa-text="" style={{
          fontFamily: fonts.text, fontSize: size, lineHeight: 1.05, color, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.015em", whiteSpace: "nowrap",
          opacity: p < 0.02 ? 0 : Math.min(1, p * 1.6), transform: `translateX(${((1 - p) * -60).toFixed(1)}px)`,
        }}>{text}</div>
      </div>
    </div>
  );
};

const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
};

/* ------------------------------------------------------------------ shared pieces */

const SHADOW = (k: number, lift: number) =>
  `0 ${(1 + lift * 5).toFixed(1)}px ${(2 + lift * 12).toFixed(1)}px rgba(26,10,10,${((0.06 + lift * 0.1) * k).toFixed(3)}), 0 1px 1px rgba(26,10,10,${(0.08 * k).toFixed(3)})`;

/** A cut sheet of paper (light, textured) with a soft shadow; children sit on it. */
const Sheet: React.FC<{ seed: number; lift: number; show: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ seed, lift, show, style, children }) => (
  <div style={{ position: "relative", borderRadius: 3, overflow: "hidden", boxShadow: SHADOW(show, lift), opacity: Math.min(1, show * 5), ...style }}>
    <PaperGround color={D.paperLight} grain={0.07} seed={seed} />
    <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>{children}</div>
  </div>
);

/** Split a phrase into at most two balanced lines (by words). */
const twoLines = (text: string): string[] => {
  const ws = text.split(" ");
  if (ws.length < 2) return [text];
  let best = [text], bestLen = text.length;
  for (let k = 1; k < ws.length; k++) {
    const a = ws.slice(0, k).join(" "), b = ws.slice(k).join(" ");
    const m = Math.max(a.length, b.length);
    if (m < bestLen) { best = [a, b]; bestLen = m; }
  }
  return best;
};

const useCurrent = (words: { at: number }[]) => {
  const t = useNarrationTime();
  return words.reduce((c, w, i) => (t >= w.at ? i : c), -1);
};

const Lead: React.FC<{ text: string; at: number; style?: React.CSSProperties }> = ({ text, at, style }) => {
  const L = useLayout();
  const p = useProgress(at, 1.1, ease.settle);
  return (
    <div data-qa-text="" style={{
      fontFamily: fonts.text, fontSize: L.size("h3"), lineHeight: 1.3, color: D.oxbloodMuted, textWrap: "balance", wordSpacing: textStyle.wordSpacing,
      opacity: p, transform: `translateY(${((1 - p) * 12).toFixed(1)}px)`, ...style,
    }}>{text}</div>
  );
};

/* ------------------------------------------------------------------ "row" */

/**
 * One paper band across the frame, divided into equal cells. As each word is spoken its colour tab drops onto
 * the top edge of its cell, the ruled separator before it draws down, and the word rises out of the cell.
 */
const RowStack: React.FC<{ scene: SceneOf<"wordStack"> }> = ({ scene }) => {
  const { lead, words } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const current = useCurrent(words);
  const n = words.length;
  const bandW = L.innerW;
  const padX = 30 * L.u;
  const cellW = bandW / n;
  const split = words.map((w) => twoLines(w.text));
  const single = words.every((w) => w.text.length * 0.55 * L.size("h1") * 0.86 < cellW - padX * 2);
  const lines = single ? words.map((w) => [w.text]) : split;
  const maxChars = Math.max(...lines.flat().map((l) => l.length));
  const fs = Math.round(Math.min(L.size("h1") * 0.86, (cellW - padX * 2) / (maxChars * 0.52)));
  const rows = Math.max(...lines.map((l) => l.length));
  const tabH = 12 * L.u;
  const bandH = tabH + 56 * L.u + rows * fs * 1.12 + 64 * L.u;
  const firstAt = words[0].at;
  const bandP = useProgress(Math.min(firstAt - 0.9, (lead?.at ?? firstAt) + 0.4), 1.3, ease.settle);
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={63} />
      <AbsoluteFill style={{ padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
        {lead && <Lead text={lead.text} at={lead.at} style={{ maxWidth: bandW * 0.72, marginBottom: 54 * L.u }} />}
        <div style={{ position: "relative", height: bandH, transform: `translateY(${((1 - bandP) * 36).toFixed(1)}px)` }}>
          {/* under-sheet: a second, darker layer peeking below the band */}
          <div style={{ position: "absolute", left: 14 * L.u, right: -10 * L.u, top: 14 * L.u, bottom: -12 * L.u, background: D.paperShade, borderRadius: 3, opacity: Math.min(1, bandP * 5), boxShadow: SHADOW(bandP, 0.2) }} />
          <Sheet seed={64} lift={0.6 * bandP} show={bandP} style={{ position: "absolute", inset: 0 }}>
            <div style={{ display: "flex", height: bandH }}>
              {words.map((w, i) => (
                <RowCell key={i} lines={lines[i]} at={w.at} size={fs} width={cellW} padX={padX} tabH={tabH} tab={TABS[i % TABS.length]}
                  mutedAt={words[i + 1]?.at ?? 1e9} active={current === i} rule={i > 0} bandH={bandH} />
              ))}
            </div>
          </Sheet>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const RowCell: React.FC<{ lines: string[]; at: number; size: number; width: number; padX: number; tabH: number; tab: string; mutedAt: number; active: boolean; rule: boolean; bandH: number }> = ({ lines, at, size, width, padX, tabH, tab, mutedAt, rule, bandH }) => {
  const L = useLayout();
  const ruleP = useProgress(at - 0.45, 0.8, ease.settle);
  const tabP = useProgress(at - 0.25, 0.7, ease.settle);
  const p = useProgress(at, 0.9, ease.settle);
  const m = useProgress(mutedAt, 0.8, ease.settle);
  const color = mix(P.oxblood, D.oxbloodMuted, m * 0.85);
  const inset = 26 * L.u;
  return (
    <div style={{ position: "relative", width, flex: "none", padding: `0 ${padX}px` }}>
      {rule && <div style={{ position: "absolute", left: 0, top: inset, width: 1.5, height: (bandH - inset * 2) * ruleP, background: D.oxbloodMuted, opacity: 0.38 }} />}
      {/* colour tab: a small cut strip that settles onto the band's top edge */}
      <div style={{
        position: "absolute", left: padX, top: 0, width: 64 * L.u, height: tabH, background: tab, borderRadius: "0 0 2px 2px",
        opacity: Math.min(1, tabP * 4), transform: `translateY(${((1 - tabP) * -18).toFixed(1)}px)`,
        boxShadow: `0 ${(tabP * 2).toFixed(1)}px ${(tabP * 4).toFixed(1)}px rgba(26,10,10,${(0.16 * tabP).toFixed(3)})`,
      }} />
      <div style={{ position: "absolute", left: padX, right: padX, top: tabH + 56 * L.u }}>
        {lines.map((ln, k) => (
          <div key={k} style={{ overflow: "hidden", padding: "0.04em 0 0.16em", margin: "-0.04em 0 -0.16em" }}>
            <div data-qa-text="" style={{
              fontFamily: fonts.text, fontSize: size, lineHeight: 1.12, color, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.015em", whiteSpace: "nowrap",
              opacity: p < 0.02 ? 0 : Math.min(1, p * 1.6), transform: `translateY(${((1 - p) * size * 0.9).toFixed(1)}px)`,
            }}>{ln}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ "offset" */

/**
 * Staggered editorial steps: word i sits one step further right and lower than the last, on its own paper
 * slip. An ink leader rule draws from the left margin to the slip just before the word is spoken; the slip
 * lifts into place and the word inks in left-to-right. The slip being spoken carries a colour edge and a
 * deeper shadow; earlier slips settle flat and their words go to muted ink.
 */
const OffsetStack: React.FC<{ scene: SceneOf<"wordStack"> }> = ({ scene }) => {
  const { lead, words } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope();
  const current = useCurrent(words);
  const n = words.length;
  const slipPadX = 0.42, edge = 10 * L.u; // em, px
  const em = (w: { text: string }) => w.text.length * 0.57 + slipPadX * 2.1;
  const rowsH = L.innerH - (lead ? 190 * L.u : 0);
  const fs0 = Math.min(L.size("h1"), rowsH / (n * 1.62));
  // the cascade spans the frame: the widest step at which every slip still fits (so the last word reaches the
  // right-hand side), within an editorial range; if even the minimum step is too wide, the type steps down
  const minStep = (L.portrait ? 0.05 : 0.08) * L.innerW, maxStep = (L.portrait ? 0.08 : 0.2) * L.innerW;
  const step = Math.max(minStep, Math.min(maxStep, ...words.map((w, i) => (L.innerW - edge - em(w) * fs0) / (i + 1))));
  const fit = Math.min(...words.map((w, i) => (L.innerW - step * (i + 1) - edge) / em(w)));
  const fs = Math.round(Math.min(fs0, fit));
  const rowH = fs * 1.62;
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={67} />
      <AbsoluteFill style={{ padding: `${L.safeY}px ${L.safeX}px`, justifyContent: "center" }}>
        {lead && <Lead text={lead.text} at={lead.at} style={{ maxWidth: L.portrait ? L.innerW : L.innerW * 0.62, marginBottom: 46 * L.u }} />}
        <div style={{ position: "relative", height: rowH * n }}>
          {words.map((w, i) => (
            <OffsetRow key={i} text={w.text} at={w.at} size={fs} top={rowH * i} rowH={rowH} left={step * (i + 1)} index={i}
              tab={TABS[i % TABS.length]} mutedAt={words[i + 1]?.at ?? 1e9} active={current === i} padX={slipPadX} edge={edge} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OffsetRow: React.FC<{ text: string; at: number; size: number; top: number; rowH: number; left: number; index: number; tab: string; mutedAt: number; active: boolean; padX: number; edge: number }> = ({ text, at, size, top, rowH, left, index, tab, mutedAt, active, padX, edge }) => {
  const L = useLayout();
  const ruleP = useProgress(at - 0.55, 0.75, ease.settle);
  const slipP = useProgress(at - 0.3, 0.9, ease.settle);
  const inkP = useProgress(at - 0.05, 0.85, ease.settle);
  const m = useProgress(mutedAt, 0.8, ease.settle);
  const color = mix(P.oxblood, D.oxbloodMuted, m * 0.85);
  const slipH = size * 1.32;
  const y = top + (rowH - slipH) / 2;
  const lift = active ? 1 : 1 - m * 0.75;
  const ruleLen = Math.max(0, left - 18 * L.u);
  const edgeW = edge * (1 - m * 0.6);
  // ink wipe mask for the word
  const e = inkP * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${e - 12}%, transparent ${e + 3}%)`;
  return (
    <>
      {/* margin numeral + leader rule (ink), drawn left → right toward the slip */}
      <div style={{ position: "absolute", left: 0, top: top + rowH / 2 - L.size("label") * 1.6, fontFamily: fonts.text, fontSize: L.size("label"), letterSpacing: "0.18em", color: D.oxbloodMuted, opacity: Math.min(1, ruleP * 2) * 0.9 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ position: "absolute", left: 0, top: top + rowH / 2, width: ruleLen * ruleP, height: 1.5, background: D.oxbloodMuted, opacity: 0.5 }} />
      <div style={{ position: "absolute", left, top: y, transform: `translateY(${((1 - slipP) * 30).toFixed(1)}px)` }}>
        <Sheet seed={68 + index} lift={lift * slipP} show={slipP} style={{ height: slipH }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: edgeW, background: tab }} />
          <div data-qa-text="" style={{
            fontFamily: fonts.text, fontSize: size, lineHeight: 1, color, wordSpacing: textStyle.wordSpacing, letterSpacing: "-0.015em", whiteSpace: "nowrap",
            padding: `0 ${padX}em 0.06em ${padX * 1.1}em`, WebkitMaskImage: mask, maskImage: mask, opacity: inkP > 0 ? 1 : 0,
          }}>{text}</div>
        </Sheet>
      </div>
    </>
  );
};
