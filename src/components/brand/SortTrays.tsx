import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { DIM, focusWeights, type Focus } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";
import { scriptGap } from "./scriptText";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Sort trays" — Islamic teaching vs cultural expectation.
 *   • each open paper tray is set on its header cue (a coloured divider tab carries the header)
 *   • each spoken example is a printed card that drops (≤ 110 px) into its tray and settles; cards stack bottom-up,
 *     behind the tray's front lip, so they physically sit inside
 *   • `focus` (tray index) dims the other trays for revisits; settled frames are still.
 * Fixed 1920×1080 artboard.
 */
const TAB_H = 66;
const CARD_H = 84, CARD_GAP = 12, CARD_BOTTOM = 846, LIP_TOP = 834, LIP_BOT = 900;
const DROP = 110;
const COLORS = [P.royal, P.rose, D.oxbloodMuted];

/** Calm focus (v004 review: ~8 toggles in 60 s, some on single words): a focus step that would be held < MIN_HOLD
 *  before the next one is skipped, repeats are merged, and the other tray only softens (to ~60 %) instead of 35 %. */
const MIN_HOLD = 2.0, SOFT_DIM = 0.6;
const calmFocus = (focus: Focus): Focus => {
  if (!Array.isArray(focus)) return focus;
  const steps = [...focus].sort((a, b) => a.at - b.at);
  const kept: { index: number | null; at: number }[] = [];
  steps.forEach((s, i) => {
    const next = steps[i + 1];
    if (next && next.at - s.at < MIN_HOLD) return;
    if (kept.length && kept[kept.length - 1].index === s.index) return;
    kept.push(s);
  });
  return kept;
};
const soften = (w: number) => SOFT_DIM + ((w - DIM) / (1 - DIM)) * (1 - SOFT_DIM);

const geom = (n: number) => (n >= 3 ? { w: 520, cx: [380, 960, 1540] } : { w: 660, cx: [570, 1350] });

const fitSize = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

/** One line if it fits at `size`, else split at the space nearest the middle. */
const splitLines = (text: string, size: number, maxW: number): string[] => {
  if (text.length * size * 0.56 <= maxW || !text.includes(" ")) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [text.slice(0, best), text.slice(best + 1)];
};
const bestSize = (text: string, maxW: number) => {
  const one = fitSize(text, 34, maxW);
  if (one >= 30 || !text.includes(" ")) return one;
  const lines = splitLines(text, 1e3, maxW);
  return Math.max(one, Math.min(30, ...lines.map((l) => fitSize(l, 30, maxW))));
};

export const SortTrays: React.FC<{ scene: SceneOf<"sortTrays"> }> = ({ scene }) => {
  const { trays, cards, caption, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `st-${scene.id}`;
  const n = Math.min(3, trays.length);
  const g = geom(n);
  const w = focusWeights(n, calmFocus(focus), t).map(soften);
  // a third tray that arrives mid-scene: the pair sits nearer centre until then, and the set eases left (≤160 px) to make room on its cue
  const k3 = useProgress(n >= 3 ? trays[2].at : -1e6, 1.2, ease.settle);
  const shiftX = n >= 3 ? Math.round(160 * (1 - k3) * 100) / 100 : 0;
  const cardW = g.w - 72;
  const textW = cardW - 64;
  const size = Math.min(34, ...cards.map((c) => bestSize(c.text, textW)));
  const tabSize = Math.min(36, ...trays.slice(0, n).map((tr) => fitSize(tr.label, 36, g.w - 100, 0.55)));
  // slot index of each card within its tray (in cue order)
  const slots = new Map<number, number>();
  const counts = [0, 0, 0];
  [...cards.map((c, i) => ({ c, i }))].sort((a, b) => a.c.at - b.c.at).forEach(({ c, i }) => {
    if (c.tray < n && counts[c.tray] < 5) slots.set(i, counts[c.tray]++);
  });
  // tray depth fits the fullest tray (min 3 slots); the whole picture is centred vertically (room for the caption)
  const depth = Math.max(3, ...counts);
  const backTop = CARD_BOTTOM - depth * (CARD_H + CARD_GAP) - 24;
  const tabTop = backTop - 80;
  const dy = Math.round((1080 - (caption ? 120 : 0) - (LIP_BOT - tabTop)) / 2 - tabTop);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <g transform={`translate(${shiftX} ${dy})`}>
        {trays.slice(0, n).map((tr, ti) => (
          <Tray key={ti} id={`${id}-t${ti}`} label={tr.label} at={tr.at} cx={g.cx[ti]} w={g.w} color={COLORS[ti]} tabSize={tabSize} weight={w[ti]} backTop={backTop} tabTop={tabTop}>
            {cards.map((c, ci) => (c.tray === ti && slots.has(ci)
              ? <Card key={ci} id={id} text={c.text} at={c.at} cx={g.cx[ti]} w={cardW} slot={slots.get(ci)!} size={size} textW={textW} color={COLORS[ti]} />
              : null))}
          </Tray>
        ))}
        </g>
        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} y={LIP_BOT + dy + 110} />}
      </svg>
    </AbsoluteFill>
  );
};

const Tray: React.FC<{ id: string; label: string; at: number; cx: number; w: number; color: string; tabSize: number; weight: number; backTop: number; tabTop: number; children: React.ReactNode }> = ({ id, label, at, cx, w, color, tabSize, weight, backTop, tabTop, children }) => {
  const p = useProgress(at, 1.2, ease.settle);
  const tp = useProgress(at + 0.25, Math.min(1.1, 0.5 + label.length * 0.035), ease.settle);
  if (p <= 0) return null;
  const x = cx - w / 2;
  const sid = id.replace(/-t\d+$/, "");
  const tabW = Math.min(w - 40, label.length * tabSize * 0.56 + 64);
  const lip = `M${x - 14},${LIP_TOP} L${x + w + 14},${LIP_TOP} L${x + w - 6},${LIP_BOT} L${x + 6},${LIP_BOT} Z`;
  return (
    <g opacity={Math.min(1, p * 5) * weight} transform={`translate(0 ${((1 - p) * 30).toFixed(2)})`}>
      {/* divider tab with the header */}
      <rect x={x + 22} y={tabTop} width={tabW} height={TAB_H + 24} rx={10} fill={color} filter={`url(#${sid}-shadow-1)`} />
      <defs><clipPath id={`${id}-tab`}><rect x={x + 22} y={tabTop} width={tabW * tp} height={TAB_H} /></clipPath></defs>
      <text data-qa-text="" x={x + 22 + 32} y={tabTop + TAB_H / 2 + tabSize * 0.36} fontFamily={fonts.text} fontSize={tabSize} fill={D.paperLight} clipPath={`url(#${id}-tab)`}>{label}</text>
      {/* back panel + inner shade */}
      <rect x={x} y={backTop} width={w} height={LIP_BOT - backTop} rx={6} fill={D.paperShade} filter={`url(#${sid}-shadow-2)`} />
      <rect x={x + 14} y={backTop + 14} width={w - 28} height={LIP_TOP - backTop - 14} rx={4} fill={D.hairline} opacity={0.45} />
      {children}
      {/* front lip: cards sit behind it */}
      <path d={lip} fill={color} filter={`url(#${sid}-shadow-2)`} />
      <path d={`M${x - 14},${LIP_TOP} L${x + w + 14},${LIP_TOP} L${x + w + 10},${LIP_TOP + 8} L${x - 10},${LIP_TOP + 8} Z`} fill={D.paperLight} opacity={0.22} />
    </g>
  );
};

const Card: React.FC<{ id: string; text: string; at: number; cx: number; w: number; slot: number; size: number; textW: number; color: string }> = ({ id, text, at, cx, w, slot, size, textW, color }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  const top = CARD_BOTTOM - CARD_H - slot * (CARD_H + CARD_GAP);
  const x = cx - w / 2;
  const lines = splitLines(text, size, textW);
  const lh = size * 1.18;
  const cy = top + (CARD_H - (slot === 0 ? CARD_BOTTOM - LIP_TOP : 0)) / 2;
  return (
    <g opacity={Math.min(1, p * 5)} transform={`translate(0 ${(-(1 - p) * DROP).toFixed(2)})`}>
      <rect x={x} y={top} width={w} height={CARD_H} rx={5} fill={D.paperLight} filter={`url(#${id}-shadow-1)`} />
      <rect x={x} y={top} width={10} height={CARD_H} rx={3} fill={color} />
      {lines.map((ln, k) => (
        <text key={k} data-qa-text="" x={x + 10 + (w - 10) / 2} y={cy + (k - (lines.length - 1) / 2) * lh + size * 0.36} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood}>{ln}</text>
      ))}
    </g>
  );
};

const CaptionScript: React.FC<{ id: string; text: string; at: number; y: number }> = ({ id, text, at, y }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  if (p <= 0) return null;
  const size = fitSize(text, 72, 900, 0.48);
  return (
    <g>
      <defs><clipPath id={id}><rect x={960 - 520} y={y - size * 1.1} width={1040 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={960} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`} {...scriptGap(size)}>{text}</text>
    </g>
  );
};
