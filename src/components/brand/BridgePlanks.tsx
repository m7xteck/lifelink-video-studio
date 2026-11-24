import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { Ink, PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Bridge planks" — the elements of partnership.
 *   • two paper cliffs with anchor posts and a taut cable are set on `cliffsAt`
 *   • each element is a plank laid onto the cable (drops ≤ 90 px, left→right) on its cue; its name is inked beneath
 *   • `railsAt`: the hand rope and hangers ink across once the bridge is complete
 *   • `focus` (plank index) dims the other planks for revisits; settled frames are still.
 * Fixed 1920×1080 artboard: planks span exactly from the left cliff edge (x 400) to the right one (x 1520).
 */
const EDGE_L = 400, EDGE_R = 1520, DECK = 600, PLANK_H = 46;
const SPAN = EDGE_R - EDGE_L;
const POST = { l: 372, r: 1548, top: 448, w: 18 };
const ROPE_SAG = 590; // quadratic control y (rope bottoms out at ~519)

const scriptWords = (text: string, size: number) => text.split(" ").map((w, i) => <tspan key={i} dx={i ? size * 0.3 : 0}>{w}</tspan>);
const fitSize = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));
const splitLines = (text: string, size: number, maxW: number): string[] => {
  if (text.length * size * 0.56 <= maxW || !text.includes(" ")) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [text.slice(0, best), text.slice(best + 1)];
};

const LEFT_CLIFF = `M0,${DECK} L${EDGE_L},${DECK} L${EDGE_L + 16},646 L${EDGE_L + 2},716 L${EDGE_L + 28},800 L${EDGE_L + 6},900 L${EDGE_L + 34},1080 L0,1080 Z`;
const RIGHT_CLIFF = `M1920,${DECK} L${EDGE_R},${DECK} L${EDGE_R - 16},646 L${EDGE_R - 2},716 L${EDGE_R - 28},800 L${EDGE_R - 6},900 L${EDGE_R - 34},1080 L1920,1080 Z`;
/** far valley floor seen through the gap: depth, kept below the plank labels */
const VALLEY = "M0,1080 L0,930 Q480,890 960,944 T1920,920 L1920,1080 Z";

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
  const labelW = pw - 24;
  const size = Math.min(40, ...planks.slice(0, n).map((p) => Math.max(fitSize(p.text, 40, labelW), Math.min(40, ...splitLines(p.text, 1e3, labelW).map((l) => fitSize(l, 40, labelW))))));
  const cliffs = useProgress(cliffsAt, 1.4, ease.settle);
  const posts = useProgress(cliffsAt + 0.4, 1.0, ease.settle);
  const rails = useProgress(railsAt ?? 1e9, 1.6, ease.settle);
  const ropeD = `M${POST.l + POST.w / 2},${POST.top} Q960,${ROPE_SAG} ${POST.r + POST.w / 2},${POST.top}`;
  const joints = [0, 1, 2, 3, 4].map((k) => EDGE_L + k * pw).filter((x) => x > EDGE_L && x < EDGE_R);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        {/* cliffs: back layer then face */}
        <g opacity={Math.min(1, cliffs * 5)} transform={`translate(0 ${((1 - cliffs) * 40).toFixed(2)})`}>
          <path d={VALLEY} fill={D.skyTint} filter={`url(#${id}-shadow-1)`} />
          <path d={LEFT_CLIFF} fill={D.hillMid} filter={`url(#${id}-shadow-2)`} />
          <path d={RIGHT_CLIFF} fill={D.hillMid} filter={`url(#${id}-shadow-2)`} />
          <rect x={0} y={DECK} width={EDGE_L} height={10} fill={D.royalDeep} opacity={0.5} />
          <rect x={EDGE_R} y={DECK} width={1920 - EDGE_R} height={10} fill={D.royalDeep} opacity={0.5} />
        </g>
        {ends && <Ends left={ends.left} right={ends.right} at={ends.at} />}
        {/* anchor posts */}
        {posts > 0 && (
          <g opacity={Math.min(1, posts * 5)} transform={`translate(0 ${((1 - posts) * 30).toFixed(2)})`}>
            {[POST.l, POST.r].map((x) => <rect key={x} x={x} y={POST.top} width={POST.w} height={DECK - POST.top} rx={3} fill={P.oxblood} filter={`url(#${id}-shadow-1)`} />)}
          </g>
        )}
        {/* deck cable the planks are laid on */}
        <Ink d={`M${POST.l + POST.w / 2},${DECK + 20} L${POST.r + POST.w / 2},${DECK + 20}`} color={P.oxblood} width={3} at={cliffsAt + 0.8} dur={1.2} />
        {/* hand rope + hangers */}
        {railsAt != null && rails > 0 && (
          <g>
            <Ink d={ropeD} color={P.oxblood} width={3} at={railsAt} dur={1.4} />
            {joints.map((x, k) => <Ink key={k} d={`M${x},${ropeY(x).toFixed(1)} L${x},${DECK}`} color={P.oxblood} width={2} at={railsAt + 0.5 + k * 0.18} dur={0.6} opacity={0.75} />)}
          </g>
        )}
        {planks.slice(0, n).map((p, i) => (
          <Plank key={i} id={id} i={i} text={p.text} at={p.at} x={EDGE_L + i * pw} w={pw} size={size} labelW={labelW} weight={w[i]} />
        ))}
        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} until={planks.slice(0, n).find((p) => p.at > caption.at)?.at} />}
      </svg>
    </AbsoluteFill>
  );
};

const Plank: React.FC<{ id: string; i: number; text: string; at: number; x: number; w: number; size: number; labelW: number; weight: number }> = ({ id, i, text, at, x, w, size, labelW, weight }) => {
  const p = useProgress(at, 1.0, ease.settle);
  const lp = useProgress(at + 0.3, Math.min(1.2, 0.5 + text.length * 0.035), ease.settle);
  if (p <= 0) return null;
  const px = x + 4, pwid = w - 8, cx = x + w / 2;
  const lines = splitLines(text, size, labelW);
  const lh = size * 1.2;
  const y0 = DECK + PLANK_H + 50 + size * 0.36;
  return (
    <g opacity={weight}>
      <g opacity={Math.min(1, p * 5)} transform={`translate(0 ${(-(1 - p) * 90).toFixed(2)})`}>
        <rect x={px} y={DECK} width={pwid} height={PLANK_H} rx={4} fill={P.rose} filter={`url(#${id}-shadow-2)`} />
        <rect x={px} y={DECK} width={pwid} height={7} rx={3} fill={D.paperLight} opacity={0.28} />
        <text data-qa-text="" x={cx} y={DECK + PLANK_H / 2 + 26 * 0.36 + 2} textAnchor="middle" fontFamily={fonts.text} fontSize={26} fill={D.paperLight}>{i + 1}</text>
      </g>
      <defs><clipPath id={`${id}-l${i}`}><rect x={cx - labelW / 2 - 10} y={DECK + PLANK_H + 10} width={(labelW + 20) * lp} height={lh * lines.length + 60} /></clipPath></defs>
      {lines.map((ln, k) => (
        <text key={k} data-qa-text="" x={cx} y={y0 + k * lh} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} clipPath={`url(#${id}-l${i})`}>{ln}</text>
      ))}
    </g>
  );
};

const Ends: React.FC<{ left: string; right: string; at: number }> = ({ left, right, at }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  const size = Math.min(32, fitSize(left, 32, 300), fitSize(right, 32, 300));
  return (
    <g opacity={p}>
      <text data-qa-text="" x={190} y={720} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.paperLight}>{left}</text>
      <text data-qa-text="" x={1730} y={720} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.paperLight}>{right}</text>
    </g>
  );
};

/** `until`: the caption belongs to one plank; it clears when the next plank is named. */
const CaptionScript: React.FC<{ id: string; text: string; at: number; until?: number }> = ({ id, text, at, until }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  const off = useProgress(until ?? 1e9, 0.6, ease.settle);
  if (p <= 0 || off >= 1) return null;
  const size = fitSize(text, 80, 900, 0.48);
  return (
    <g opacity={1 - off}>
      <defs><clipPath id={id}><rect x={960 - 520} y={300 - size * 1.1} width={1040 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={960} y={300} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{scriptWords(text, size)}</text>
    </g>
  );
};
