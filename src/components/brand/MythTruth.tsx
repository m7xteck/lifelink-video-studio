import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { ease } from "../../brand/tokens";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, ScriptWord, Stage, fitLines, inkDur, tracked, txt } from "./stage";

/*
 * Signature: "Myth / Truth" — a myth is written on a cut-paper slip stamped MYTH; on the correcting phrase
 * (`tearAt`) the slip tears like real paper: the rip runs from the top edge down (a white fibre edge appears
 * along it, the top opens first), then the two torn halves lift (their shadows deepen), part and drop away,
 * revealing the truth sheet that lay beneath.
 *   • `index`: script ordinal above the slip ("first"); `myth`: slip lifts into place (≤ 60 px) and the myth is inked
 *   • `truth`: the label is inked once the halves have parted; the truth sentence comes into focus on its cue
 *   • `notes`: up to 5 spoken words set along the foot of the truth sheet, each on its cue
 *   • `past` + `short`: a tally of torn myths along the bottom (cumulative across the chapter): earlier myths are
 *     present from the start, this myth's chip joins the tally after the tear. Settled frames are still.
 */
const X0 = 370, Y0 = 336, W = 1180, H = 404, PAD = 72;
const TALLY_Y = 852;

// ---- the tear: a fine, irregular, slightly slanted line (deterministic) ----
const N = 34;
const rnd = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const tearPts = Array.from({ length: N + 1 }, (_, i) => {
  const y = (H * i) / N;
  const wob = i === 0 || i === N ? 0 : (rnd(i, 1) - 0.5) * 22 + Math.sin(i * 0.9) * 5;
  return [W / 2 + 30 - 60 * (y / H) + wob, y] as const;
});
// the white paper core exposed along each torn edge: a second, finer jag just inside the cut
const fibre = (side: -1 | 1) => tearPts.map(([x, y], i) => [x + side * (2.5 + rnd(i, side + 5) * 5), y] as const);
const BOTTOM = tearPts[N];
const px = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ");
const LEFT_CLIP = `polygon(0px 0px, ${px(tearPts)}, 0px ${H}px)`;
const RIGHT_CLIP = `polygon(${px([...tearPts].reverse())}, ${W}px 0px, ${W}px ${H}px)`;
const poly = (pts: readonly (readonly [number, number])[]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
const TEAR_D = poly(tearPts);

const shadow = (lift: number) =>
  `drop-shadow(0px ${(5 + lift * 14).toFixed(1)}px ${(7 + lift * 12).toFixed(1)}px rgba(26,10,10,${(0.2 - lift * 0.04).toFixed(3)}))`;

/** Paper grain multiplied into a sheet (inside an overflow-hidden parent). */
const Grain: React.FC<{ opacity?: number; flip?: boolean }> = ({ opacity = 0.5, flip }) => (
  <Img src={staticFile("textures/paper-grain.png")} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, mixBlendMode: "multiply", opacity, transform: flip ? "scale(-1,1)" : undefined, pointerEvents: "none" }} />
);

export const MythTruth: React.FC<{ scene: SceneOf<"mythTruth"> }> = ({ scene }) => {
  const { index, myth, tearAt, truth, notes = [], past = [], short } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const slip = useProgress(myth.at - 0.25, 1.2, ease.settle);
  const stamp = useProgress(Math.min(myth.at + 0.5, tearAt - 0.5), 0.45, ease.settle);
  // rip: the tear runs down the slip (0.5 s) · part: the halves lift, separate and drop away
  const rip = useProgress(tearAt, 0.5, ease.settle);
  const part = useProgress(tearAt + 0.3, 1.5, ease.settle);
  const fade = interpolate(part, [0.35, 0.9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripping = t >= tearAt;
  // every myth fits its slip and every truth its sheet (short myths cued close to the tear, long truths with notes):
  // two lines at the larger sizes, else three lines at a size that still clears the notes row
  const fits = (text: string, sizes: number[], lines: number) => sizes.find((z) => Math.ceil((text.length * 0.56 * z) / ((W - PAD * 2) * 0.86)) <= lines);
  const mythSize = fits(myth.text, [66, 60, 54, 48], 2) ?? fits(myth.text, [48, 44], 3) ?? 40;
  const truthSize = notes.length
    ? fits(truth.text, [60, 54, 48], 2) ?? fits(truth.text, [44], 3) ?? 40
    : fitLines(truth.text, [60, 54, 48, 44], W - PAD * 2, 3);
  // the myth is fully written before the tear, however close the correcting phrase follows ("is that …" → "however")
  const mythInk = Math.max(0.6, Math.min(inkDur(myth.text) + 0.3, tearAt - myth.at - 0.15));
  const noteChars = notes.reduce((s, n) => s + n.text.length, 0);
  const noteSize = Math.max(26, Math.min(36, Math.floor((W - PAD * 2 - (notes.length - 1) * 70) / Math.max(1, noteChars * 0.56))));
  const labelAt = tearAt + 1.2; // once the halves have cleared
  const ruleP = useProgress(labelAt + 0.2, 1.0, ease.settle);

  const slipFace = (
    <div style={{ position: "absolute", inset: 0, background: D.paperShade, overflow: "hidden" }}>
      <Grain opacity={0.55} />
      <div style={{ position: "absolute", left: PAD, top: 54, padding: "7px 16px 5px 19px", border: `2.5px solid ${P.rose}`, borderRadius: 3,
        opacity: stamp > 0 ? Math.min(1, stamp * 3) * 0.92 : 0, transform: `scale(${(1.1 - 0.1 * stamp).toFixed(4)})`, transformOrigin: "left center" }}>
        <span style={tracked(26, P.rose)}><span data-qa-text="">Myth</span></span>
      </div>
      <Ink at={myth.at} dur={mythInk} style={{ position: "absolute", left: PAD, top: 142, width: W - PAD * 2 }}>
        <div data-qa-text="" data-qa-overlap-ok="" style={txt(mythSize, P.oxblood)}>{myth.text}</div>
      </Ink>
    </div>
  );

  // the halves turn by ≤ 2° about the foot of the tear (the top opens first, as paper does), then part and drop
  const theta = 0.8 * rip * rip + 1.2 * part;
  const lift = Math.min(1, rip * 0.4 + part * 1.2);
  const fibreReveal = rip;

  // tally chips: fixed slots centred on the final count, so earlier chips never shift when this one joins
  const chips = [...past, ...(short ? [short] : [])];
  const chipChars = chips.reduce((n, c) => n + c.length, 0);
  // the tally always fits the frame (≤ 1560 px), however many myths have been torn
  const chipSize = Math.max(20, Math.min(26, Math.floor((1560 - chips.length * 72) / Math.max(1, chipChars * 0.56))));
  const chipW = chips.map((c) => Math.round(c.length * chipSize * 0.56 + 52));
  const gap = 20;
  const total = chipW.reduce((s, w) => s + w, 0) + gap * Math.max(0, chips.length - 1);
  let cx = 960 - total / 2;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {index && <ScriptWord text={index.text} at={index.at} size={78} color={P.oxblood} style={{ position: "absolute", left: X0 - 8, top: 206 }} />}

        {/* truth sheet: lies beneath the slip; seen only once the tear opens */}
        {ripping && (
          <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: shadow(0) }}>
            <div style={{ position: "absolute", inset: 0, background: D.paperLight, overflow: "hidden" }}><Grain opacity={0.32} flip /></div>
            <ScriptWord text={truth.label ?? "truth"} at={labelAt} size={66} color={P.royal} style={{ position: "absolute", left: PAD - 8, top: 30 }} />
            <div style={{ position: "absolute", left: PAD, top: 128, height: 1.5, width: (W - PAD * 2) * ruleP, background: P.sky }} />
            <FocusIn at={Math.max(truth.at, tearAt + 1.4)} style={{ position: "absolute", left: PAD, top: 156, width: W - PAD * 2 }}>
              <div data-qa-text="" style={txt(truthSize, P.oxblood)}>{truth.text}</div>
            </FocusIn>
            <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 42, display: "flex", alignItems: "baseline" }}>
              {notes.slice(0, 5).map((n, i) => {
                const at = Math.max(n.at, tearAt + 2.0);
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <Sep at={at} />}
                    <Ink at={at} dur={inkDur(n.text)}>
                      <span data-qa-text="" style={txt(noteSize, D.royalDeep, { whiteSpace: "nowrap" })}>{n.text}</span>
                    </Ink>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* the myth slip: whole until the tear */}
        {slip > 0 && !ripping && (
          <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: shadow(0.25), opacity: Math.min(1, slip * 4), transform: `translateY(${((1 - slip) * 60).toFixed(2)}px)` }}>{slipFace}</div>
        )}
        {/* …then two torn halves, each with its own fibre edge and shadow */}
        {ripping && fade > 0 && ([[-1, LEFT_CLIP], [1, RIGHT_CLIP]] as const).map(([s, clip]) => (
          <div key={s} style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: shadow(lift), opacity: fade,
            transform: `translate(${(s * 132 * part).toFixed(2)}px, ${(40 * part).toFixed(2)}px) rotate(${(s * theta).toFixed(3)}deg)`,
            transformOrigin: `${BOTTOM[0].toFixed(1)}px ${BOTTOM[1].toFixed(1)}px` }}>
            <div style={{ position: "absolute", inset: 0, clipPath: clip }}>
              {slipFace}
              <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {/* exposed paper core: a light, irregular band along the torn edge, revealed top → bottom as the rip runs */}
                <path d={poly([...tearPts, ...[...fibre(s)].reverse()]) + " Z"} fill={D.paperLight} opacity={0.95}
                  style={{ clipPath: `inset(0px 0px ${((1 - fibreReveal) * H).toFixed(1)}px 0px)` }} />
                <path d={TEAR_D} stroke={D.hairline} strokeWidth={1.2} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - fibreReveal} opacity={0.8} />
              </svg>
            </div>
          </div>
        ))}

        {/* tally of torn myths */}
        {chips.map((c, i) => {
          const left = cx; cx += chipW[i] + gap;
          const isNew = short && i === chips.length - 1;
          const at = isNew ? tearAt + 1.6 : -1;
          return <Chip key={i} text={c} at={at} left={left} width={chipW[i]} size={chipSize} />;
        })}
      </Stage>
    </AbsoluteFill>
  );
};

/** A fine vertical hairline between notes, set with the note it precedes. */
const Sep: React.FC<{ at: number }> = ({ at }) => {
  const p = useProgress(at, 0.6, ease.settle);
  return <div style={{ width: 1.5, height: 30, margin: "0 34px", background: D.hairline, alignSelf: "center", transform: `scaleY(${p.toFixed(3)})` }} />;
};

/** A small torn-myth chip: muted paper with a torn right edge, struck through. */
const Chip: React.FC<{ text: string; at: number; left: number; width: number; size: number }> = ({ text, at, left, width, size }) => {
  const p = useProgress(at, 0.9, ease.settle);
  if (p <= 0) return null;
  const h = 54;
  const edge = Array.from({ length: 7 }, (_, i) => `${(width - 4 - rnd(i, width) * 7).toFixed(1)}px ${((h * i) / 6).toFixed(1)}px`).join(", ");
  return (
    <div style={{ position: "absolute", left, top: TALLY_Y, width, height: h, opacity: Math.min(1, p * 3), transform: `translateY(${((1 - p) * 24).toFixed(2)}px)`, filter: shadow(0) }}>
      <div style={{ position: "absolute", inset: 0, background: D.paperShade, overflow: "hidden", clipPath: `polygon(0px 0px, ${edge}, 0px ${h}px)` }}><Grain opacity={0.45} /></div>
      <div data-qa-text="" style={txt(size, D.oxbloodMuted, { position: "absolute", left: 0, right: 6, top: 11, textAlign: "center", whiteSpace: "nowrap" })}>{text}</div>
      <div style={{ position: "absolute", left: 18, top: 28, height: 2, width: (width - 40) * Math.min(1, Math.max(0, p * 1.6 - 0.6)), background: P.rose }} />
    </div>
  );
};
