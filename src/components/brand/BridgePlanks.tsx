import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { Ink, PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Bridge planks" — the elements of partnership (v3: centred composition).
 *   • a still paper gorge fills the frame: a pale sky over layered far ridges, two cut-paper cliffs meeting the frame
 *     centre-line; on `cliffsAt` the anchor posts stand up and the deck cable is drawn between them
 *   • each element is a plank laid onto the cable on its cue, left→right: it is lowered (soft start, ≤ 70 px) and settles
 *     with its weight (the cable dips a few px under it, then holds still); its name sits on a paper tag below, joined by a
 *     fine leader rule (tags alternate between two rows so long names never crowd)
 *   • `railsAt`: the hand rope and hangers ink across once the bridge is complete
 *   • `focus` (plank index) dims the other planks + tags for revisits; settled frames are still.
 * Fixed 1920×1080 artboard: planks span exactly from the left cliff edge to the right one.
 */
const EDGE_L = 420, EDGE_R = 1500, DECK = 520, PLANK_H = 40;
const SPAN = EDGE_R - EDGE_L;
const POST = { l: EDGE_L - 34, r: EDGE_R + 16, top: 372, w: 18 };
const ROPE_SAG = 520;
const TAG_ROWS = [668, 780];
const TAG_H = 62;
/** lowering curve: soft start, gentle arrival onto the cable */
const LOWER = Easing.bezier(0.45, 0, 0.6, 1);

const scriptWords = (text: string, size: number) => text.split(" ").map((w, i) => <tspan key={i} dx={i ? size * 0.3 : 0}>{w}</tspan>);
const fitSize = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

const ridge = (base: number, amp: number, freq: number, phase: number) => {
  const xs = Array.from({ length: 49 }, (_, i) => i * 40);
  return `M0,1080 L${xs.map((x) => `${x},${(base + amp * Math.sin(x / freq + phase)).toFixed(1)}`).join(" L")} L1920,1080 Z`;
};
// cliffs: a back sheet (lighter, set back) and a front face; their tops are level with the deck
// the back sheet is a darker rock stratum that steps out into the gorge below the deck (depth, never above the deck)
const LEFT_BACK = `M0,${DECK + 150} L${EDGE_L + 30},${DECK + 160} L${EDGE_L + 66},${DECK + 300} L${EDGE_L + 48},${DECK + 420} L${EDGE_L + 90},1080 L0,1080 Z`;
const LEFT_CLIFF = `M0,${DECK} L${EDGE_L},${DECK} L${EDGE_L + 14},${DECK + 56} L${EDGE_L},${DECK + 130} L${EDGE_L + 30},${DECK + 250} L${EDGE_L + 8},${DECK + 380} L${EDGE_L + 40},1080 L0,1080 Z`;
const RIGHT_BACK = `M1920,${DECK + 150} L${EDGE_R - 30},${DECK + 160} L${EDGE_R - 66},${DECK + 300} L${EDGE_R - 48},${DECK + 420} L${EDGE_R - 90},1080 L1920,1080 Z`;
const RIGHT_CLIFF = `M1920,${DECK} L${EDGE_R},${DECK} L${EDGE_R - 14},${DECK + 56} L${EDGE_R},${DECK + 130} L${EDGE_R - 30},${DECK + 250} L${EDGE_R - 8},${DECK + 380} L${EDGE_R - 40},1080 L1920,1080 Z`;

/** y of the hand rope at x (quadratic from post top to post top). */
const ropeY = (x: number) => {
  const u = (x - POST.l - POST.w / 2) / (POST.r - POST.l);
  return (1 - u) * (1 - u) * POST.top + 2 * u * (1 - u) * ROPE_SAG + u * u * POST.top;
};

export const BridgePlanks: React.FC<{ scene: SceneOf<"bridgePlanks"> }> = ({ scene }) => {
  const { cliffsAt, ends, planks, railsAt, caption, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `bp-${scene.id}`;
  const n = Math.min(4, planks.length);
  const pw = SPAN / 4;
  const w = focusWeights(n, focus, t);
  const size = Math.min(32, ...planks.slice(0, n).map((p) => fitSize(p.text, 32, 2 * pw - 110)));
  const posts = useProgress(cliffsAt, 1.2, ease.settle);
  const rails = useProgress(railsAt ?? 1e9, 1.6, ease.settle);
  const ropeD = `M${POST.l + POST.w / 2},${POST.top} Q960,${ROPE_SAG} ${POST.r + POST.w / 2},${POST.top}`;
  const joints = [1, 2, 3].map((k) => EDGE_L + k * pw);
  // weight: the deck dips under each plank as it lands (≤ 5 px), then recovers; nothing moves once settled
  const dip = planks.slice(0, n).reduce((acc, p) => {
    const k = interpolate(t, [p.at + 0.55, p.at + 0.8, p.at + 1.6], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
    return acc + k * 5;
  }, 0);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.skyTint} stopOpacity="0.95" />
            <stop offset="55%" stopColor={D.skyTint} stopOpacity="0.35" />
            <stop offset="100%" stopColor={D.paperLight} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`${id}-rock`} gradientUnits="userSpaceOnUse" x1="0" y1={DECK} x2="0" y2="1080">
            <stop offset="0%" stopColor={D.skyTint} stopOpacity="0.45" />
            <stop offset="100%" stopColor={D.skyTint} stopOpacity="0" />
          </linearGradient>
          <PaperTextureDefs id={id} strength={0.26} />
        </defs>
        {/* still landscape: sky, three far ridges receding into the gorge, then the cliffs */}
        <rect width="1920" height="1080" fill={`url(#${id}-sky)`} />
        <path d={ridge(462, 16, 210, 1.7)} fill={D.skyTint} opacity={0.9} />
        <path d={ridge(610, 18, 230, 0.6)} fill={D.skyTint} filter={`url(#${id}-shadow-1)`} />
        {/* layered tints recede from pale sky to the nearest stratum; the cliffs stay quiet (light tints + paper grain)
            so the oxblood bridge and its paper tags lead the frame. Shadow and texture on separate copies (nested filters clip). */}
        <path d={ridge(740, 22, 300, 2.4)} fill={D.hillFar} opacity={0.4} filter={`url(#${id}-shadow-1)`} />
        <path d={ridge(900, 20, 360, 4.2)} fill={D.hillFar} opacity={0.6} filter={`url(#${id}-shadow-1)`} />
        {[LEFT_BACK, RIGHT_BACK].map((d) => (
          <React.Fragment key={d}>
            <path d={d} fill={D.hillMid} opacity={0.8} filter={`url(#${id}-shadow-2)`} />
            <path d={d} fill={D.hillMid} opacity={0.8} filter={`url(#${id}-tex)`} />
          </React.Fragment>
        ))}
        {[LEFT_CLIFF, RIGHT_CLIFF].map((d) => (
          <React.Fragment key={d}>
            <path d={d} fill={D.hillFar} filter={`url(#${id}-shadow-2)`} />
            <path d={d} fill={D.hillFar} filter={`url(#${id}-tex)`} />
            {/* soft wash toward the sky tint at the cliff top: the rock lightens with distance from the gorge floor */}
            <path d={d} fill={`url(#${id}-rock)`} />
          </React.Fragment>
        ))}
        <rect x={0} y={DECK} width={EDGE_L} height={6} fill={P.royal} opacity={0.35} />
        <rect x={EDGE_R} y={DECK} width={1920 - EDGE_R} height={6} fill={P.royal} opacity={0.35} />
        {ends && <Ends left={ends.left} right={ends.right} at={ends.at} />}

        {/* anchor posts stand up on the cliff tops */}
        {posts > 0 && (
          <g opacity={Math.min(1, posts * 5)} transform={`translate(0 ${((1 - posts) * 30).toFixed(2)})`}>
            {[POST.l, POST.r].map((x) => <rect key={x} x={x} y={POST.top} width={POST.w} height={DECK - POST.top} rx={3} fill={P.oxblood} filter={`url(#${id}-shadow-1)`} />)}
          </g>
        )}
        {/* deck cable the planks are laid on (dips with each plank's weight) */}
        <Ink d={`M${POST.l + POST.w / 2},${DECK + 16} Q960,${(DECK + 16 + dip * 2).toFixed(2)} ${POST.r + POST.w / 2},${DECK + 16}`} color={P.oxblood} width={3} at={cliffsAt + 0.5} dur={1.2} />
        {/* hand rope + hangers */}
        {railsAt != null && rails > 0 && (
          <g>
            <Ink d={ropeD} color={P.oxblood} width={3} at={railsAt} dur={1.4} />
            {joints.map((x, k) => <Ink key={k} d={`M${x},${ropeY(x).toFixed(1)} L${x},${DECK}`} color={P.oxblood} width={2} at={railsAt + 0.5 + k * 0.18} dur={0.6} opacity={0.75} />)}
          </g>
        )}
        <g transform={`translate(0 ${dip.toFixed(2)})`}>
          {planks.slice(0, n).map((p, i) => (
            <Plank key={i} id={id} i={i} text={p.text} at={p.at} x={EDGE_L + i * pw} w={pw} size={size} weight={w[i]} />
          ))}
        </g>
        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} until={planks.slice(0, n).find((p) => p.at > caption.at)?.at} />}
      </svg>
      <TextureGate />
    </AbsoluteFill>
  );
};

const Plank: React.FC<{ id: string; i: number; text: string; at: number; x: number; w: number; size: number; weight: number }> = ({ id, i, text, at, x, w, size, weight }) => {
  // lowered with a soft start; lands at 0.8 s (the deck takes its weight), then still
  const t = useNarrationTime();
  const p = interpolate(t, [at, at + 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: LOWER });
  const tagP = useProgress(at + 0.7, 0.9, ease.settle);
  const lead = useProgress(at + 0.55, 0.7, ease.settle);
  if (t < at) return null;
  const px = x + 5, pwid = w - 10, cx = x + w / 2;
  const row = TAG_ROWS[i % 2];
  const tagW = Math.min(2 * w - 70, text.length * size * 0.56 + 56);
  const ty = row + TAG_H / 2 + size * 0.36;
  return (
    <g>
      {/* leader rule from the plank's underside to its tag */}
      <path d={`M${cx},${DECK + PLANK_H + 6} L${cx},${row}`} stroke={P.oxblood} strokeWidth={1.5} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lead} opacity={0.7 * weight} />
      <circle cx={cx} cy={DECK + PLANK_H + 6} r={3.5} fill={P.oxblood} opacity={lead > 0 ? 0.8 * weight : 0} />
      {tagP > 0 && (
        <g opacity={Math.min(1, tagP * 4)} transform={`translate(0 ${((1 - tagP) * 14).toFixed(2)})`}>
          <rect x={cx - tagW / 2} y={row} width={tagW} height={TAG_H} rx={4} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
          <rect x={cx - tagW / 2} y={row} width={tagW} height={5} rx={2} fill={P.rose} opacity={weight} />
          {/* dimmed (focus elsewhere): the paper stays opaque, only the ink recedes */}
          <text data-qa-text="" x={cx} y={ty + 2} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} opacity={0.3 + 0.7 * ((weight - 0.35) / 0.65)}>{text}</text>
        </g>
      )}
      <g opacity={Math.min(1, p * 6)} transform={`translate(0 ${(-(1 - p) * 70).toFixed(2)})`}>
        <rect x={px} y={DECK} width={pwid} height={PLANK_H} rx={3} fill={P.rose} filter={`url(#${id}-shadow-2)`} />
        <rect x={px} y={DECK + PLANK_H - 9} width={pwid} height={9} rx={2} fill={P.oxblood} opacity={0.35} />
        <rect x={px} y={DECK} width={pwid} height={6} rx={2} fill={D.paperLight} opacity={0.3} />
        <text data-qa-text="" x={cx} y={DECK + PLANK_H / 2 + 24 * 0.36 - 2} textAnchor="middle" fontFamily={fonts.text} fontSize={24} fill={D.paperLight}>{i + 1}</text>
        <rect x={px} y={DECK} width={pwid} height={PLANK_H} rx={3} fill={D.paperShade} opacity={(1 - weight) * 0.95} />
      </g>
    </g>
  );
};

const Ends: React.FC<{ left: string; right: string; at: number }> = ({ left, right, at }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  const size = Math.min(32, fitSize(left, 32, 300), fitSize(right, 32, 300));
  return (
    <g opacity={p}>
      <text data-qa-text="" x={EDGE_L / 2} y={DECK + 180} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood}>{left}</text>
      <text data-qa-text="" x={(EDGE_R + 1920) / 2} y={DECK + 180} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood}>{right}</text>
    </g>
  );
};

/** `until`: the caption belongs to one plank; it clears when the next plank is named. */
const CaptionScript: React.FC<{ id: string; text: string; at: number; until?: number }> = ({ id, text, at, until }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  const off = useProgress(until ?? 1e9, 0.6, ease.settle);
  if (p <= 0 || off >= 1) return null;
  const size = fitSize(text, 84, 900, 0.48);
  const y = 230;
  return (
    <g opacity={1 - off}>
      <defs><clipPath id={id}><rect x={960 - 540} y={y - size * 1.1} width={1080 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={960} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{scriptWords(text, size)}</text>
    </g>
  );
};
