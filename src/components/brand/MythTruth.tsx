import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { ease } from "../../brand/tokens";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, SHADOW_1, SHADOW_2, ScriptWord, Stage, fit1, fitLines, inkDur, tracked, txt } from "./stage";

/*
 * Signature: "Myth / Truth" — a myth is written on a paper slip stamped MYTH; on the correcting phrase
 * (`tearAt`) a rip runs down the slip, the two halves part and fall away, and the truth card beneath is revealed.
 *   • `index`: script ordinal above the slip ("first"); `myth`: slip slides up (≤ 70 px) and the myth is inked
 *   • `truth`: "truth" is inked on the revealed card at the tear; the truth sentence comes into focus on its cue
 *   • `notes`: up to 5 spoken words set along the foot of the truth card, each on its cue
 *   • `past` + `short`: a tally of torn myths along the bottom (cumulative across the chapter): earlier myths are
 *     present from the start, this myth's chip joins the tally after the tear. Settled frames are still.
 */
const X0 = 400, Y0 = 356, W = 1120, H = 384, PAD = 64;
const TALLY_Y = 846;

// the tear: a slightly slanted jagged line, deterministic
const JAG = [0, 9, -7, 12, -10, 6, -12, 8, -5, 11, -9, 7, -11, 10, -6, 0];
const tearPts = JAG.map((j, i) => {
  const y = (H * i) / (JAG.length - 1);
  return [W / 2 + 34 - 68 * (y / H) + j, y] as const;
});
const px = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ");
const LEFT_CLIP = `polygon(0px 0px, ${px(tearPts)}, 0px ${H}px)`;
const RIGHT_CLIP = `polygon(${px([...tearPts].reverse())}, ${W}px 0px, ${W}px ${H}px)`;
const TEAR_D = "M" + tearPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");

export const MythTruth: React.FC<{ scene: SceneOf<"mythTruth"> }> = ({ scene }) => {
  const { index, myth, tearAt, truth, notes = [], past = [], short } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const slip = useProgress(myth.at - 0.2, 1.2, ease.settle);
  const stamp = useProgress(myth.at + 0.5, 0.5, ease.settle);
  const rip = useProgress(tearAt, 0.55, ease.settle);
  const part = useProgress(tearAt + 0.5, 1.3, ease.settle);
  const fade = interpolate(part, [0.5, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const torn = part > 0;
  const mythSize = fitLines(myth.text, [64, 58, 52, 46], W - PAD * 2, 2);
  const truthSize = fitLines(truth.text, [60, 54, 48, 44], W - PAD * 2, 2);
  const noteChars = notes.reduce((s, n) => s + n.text.length, 0);
  const noteSize = Math.max(24, Math.min(34, Math.floor((W - PAD * 2 - (notes.length - 1) * 46) / Math.max(1, noteChars * 0.56))));

  const slipFace = (
    <div style={{ position: "absolute", inset: 0, background: D.paperShade, borderRadius: 4 }}>
      <div style={{ position: "absolute", left: PAD, top: 46, padding: "6px 16px 4px", border: `3px solid ${P.rose}`, borderRadius: 4,
        opacity: stamp > 0 ? Math.min(1, stamp * 3) : 0, transform: `scale(${1.12 - 0.12 * stamp})`, transformOrigin: "left center" }}>
        <span style={tracked(28, P.rose)}>Myth</span>
      </div>
      <Ink at={myth.at} dur={inkDur(myth.text) + 0.3} style={{ position: "absolute", left: PAD, top: 128, width: W - PAD * 2 }}>
        <div data-qa-text="" data-qa-overlap-ok="" style={txt(mythSize, P.oxblood)}>{myth.text}</div>
      </Ink>
    </div>
  );

  // tally chips: fixed slots centred on the final count, so earlier chips never shift when this one joins
  const chips = [...past, ...(short ? [short] : [])];
  const chipSize = 26;
  const chipW = chips.map((c) => Math.round(c.length * chipSize * 0.56 + 48));
  const gap = 18;
  const total = chipW.reduce((s, w) => s + w, 0) + gap * Math.max(0, chips.length - 1);
  let cx = 960 - total / 2;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {index && <ScriptWord text={index.text} at={index.at} size={76} color={P.oxblood} style={{ position: "absolute", left: X0 - 8, top: 226 }} />}

        {/* truth card, revealed beneath the slip */}
        {torn && (
          <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: SHADOW_1 }}>
            <div style={{ position: "absolute", inset: 0, background: D.paperLight, borderRadius: 4, borderLeft: `10px solid ${P.royal}` }} />
            <ScriptWord text={truth.label ?? "truth"} at={tearAt + 1.5} size={64} color={P.royal} style={{ position: "absolute", left: PAD - 6, top: 26 }} />
            <FocusIn at={Math.max(truth.at, tearAt + 1.6)} style={{ position: "absolute", left: PAD, top: 132, width: W - PAD * 2 }}>
              <div data-qa-text="" style={txt(truthSize, P.oxblood)}>{truth.text}</div>
            </FocusIn>
            <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 40, display: "flex", gap: 46, alignItems: "baseline" }}>
              {notes.slice(0, 5).map((n, i) => (
                <Ink key={i} at={Math.max(n.at, tearAt + 1.8)} dur={inkDur(n.text)}>
                  <span data-qa-text="" style={txt(noteSize, D.royalDeep, { whiteSpace: "nowrap" })}>{n.text}</span>
                </Ink>
              ))}
            </div>
          </div>
        )}

        {/* the myth slip: whole until the tear, then two halves that part and fall away */}
        {/* whole until the halves start to part (no seam before the tear) */}
        {slip > 0 && part <= 0 && (
          <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: SHADOW_2, opacity: Math.min(1, slip * 4), transform: `translateY(${((1 - slip) * 70).toFixed(2)}px)` }}>{slipFace}</div>
        )}
        {part > 0 && fade > 0 && ([["left", LEFT_CLIP, -1], ["right", RIGHT_CLIP, 1]] as const).map(([k, clip, s]) => (
          <div key={k} style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, filter: SHADOW_2, opacity: Math.min(1, slip * 4) * fade,
            transform: `translate(${(s * 150 * part).toFixed(2)}px, ${((1 - slip) * 70 + 46 * part).toFixed(2)}px)` }}>
            <div style={{ position: "absolute", inset: 0, clipPath: clip }}>{slipFace}</div>
          </div>
        ))}
        {rip > 0 && fade > 0 && (
          <svg width={W} height={H} style={{ position: "absolute", left: X0, top: Y0, overflow: "visible", opacity: 1 - part }}>
            <path d={TEAR_D} stroke={D.paperLight} strokeWidth={6} fill="none" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - rip} />
            <path d={TEAR_D} stroke={D.hairline} strokeWidth={1.5} fill="none" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - rip} transform="translate(2 0)" />
          </svg>
        )}

        {/* tally of torn myths */}
        {chips.map((c, i) => {
          const left = cx; cx += chipW[i] + gap;
          const isNew = short && i === chips.length - 1;
          const at = isNew ? tearAt + 1.4 : -1;
          return <Chip key={i} text={c} at={at} left={left} width={chipW[i]} size={chipSize} />;
        })}
      </Stage>
    </AbsoluteFill>
  );
};

/** A small torn-myth chip: muted paper, struck through. */
const Chip: React.FC<{ text: string; at: number; left: number; width: number; size: number }> = ({ text, at, left, width, size }) => {
  const p = useProgress(at, 0.9, ease.settle);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left, top: TALLY_Y, width, height: 54, opacity: Math.min(1, p * 3), transform: `translateY(${((1 - p) * 24).toFixed(2)}px)`, filter: SHADOW_1 }}>
      <div style={{ position: "absolute", inset: 0, background: D.paperShade, borderRadius: 3 }} />
      <div data-qa-text="" style={txt(size, D.oxbloodMuted, { position: "absolute", left: 0, right: 0, top: 11, textAlign: "center", whiteSpace: "nowrap" })}>{text}</div>
      <div style={{ position: "absolute", left: 16, top: 28, height: 2.5, width: (width - 32) * Math.min(1, Math.max(0, p * 1.6 - 0.6)), background: P.rose }} />
    </div>
  );
};
