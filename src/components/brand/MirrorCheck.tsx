import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import { ease } from "../../brand/tokens";
import { focusWeights } from "../../motion/focus";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, ScriptWord, Stage, fit1, fitLines, inkDur, tracked, txt } from "./stage";

/*
 * Signature: "Mirror check" — an oval mirror built from layered cut paper (oxblood frame, paper mat, pale glass);
 * each question appears inside the glass (looking inward) and, once the next question is asked, the answered
 * question is filed as a short line on a numbered checklist beside it.
 *   • the frame, mat and glass are laid one on another from `mirrorAt`; a single highlight is then drawn on the glass
 *   • the checklist's empty numbered rules are set out before the first question ("these six questions")
 *   • `title` (script, e.g. "mirror check") is inked in the glass until the first question, and returns on `doneAt`
 *   • each question comes into focus in the glass on its cue, with its number; optional spoken `notes` ink in below
 *   • the stack row (number + `short`) is inked when the question is answered (next question's cue / `doneAt`)
 *   • `focus` dims the other stack rows for revisits. Settled frames are still.
 */
const MX = 600, MY = 540, RX = 300, RY = 392, FR = 36, MAT = 16;
const STACK_X = 1090, STACK_W = 660, STACK_Y = 206, STACK_ROW = 114;
/** An oval band (outer minus inner ellipse): cut paper with an opening, so nothing solid flashes before the glass is laid. */
const band = (rxo: number, ryo: number, rxi: number, ryi: number) =>
  `M${MX - rxo},${MY} a${rxo},${ryo} 0 1,0 ${2 * rxo},0 a${rxo},${ryo} 0 1,0 ${-2 * rxo},0 Z M${MX - rxi},${MY} a${rxi},${ryi} 0 1,1 ${2 * rxi},0 a${rxi},${ryi} 0 1,1 ${-2 * rxi},0 Z`;
const num = (n: number) => String(n).padStart(2, "0");

export const MirrorCheck: React.FC<{ scene: SceneOf<"mirrorCheck"> }> = ({ scene }) => {
  const { mirrorAt, title, questions, doneAt, focus } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `mc-${scene.id}`;
  // construction: frame → mat → glass → one drawn highlight
  const frame = useProgress(mirrorAt, 1.3, ease.settle);
  const mat = useProgress(mirrorAt + 0.3, 1.1, ease.settle);
  const glass = useProgress(mirrorAt + 0.6, 1.4, ease.settle);
  const hi = useProgress(mirrorAt + 1.1, 1.2, ease.settle);
  const qs = questions.slice(0, 6);
  const answeredAt = qs.map((_, i) => (i < qs.length - 1 ? qs[i + 1].at : doneAt ?? 1e9));
  const w = focusWeights(qs.length, focus, t);
  const titleOut = useProgress(qs.length ? qs[0].at - 0.4 : 1e9, 0.6, ease.settle);
  const titleBackP = useProgress(doneAt ?? 1e9, 0.8, ease.settle);
  const titleBack = doneAt != null && t >= doneAt;
  const stackSize = Math.min(44, ...qs.map((q) => fit1(q.short, 44, STACK_W - 110, 28)));
  const slotsAt = qs.length ? Math.max(mirrorAt + 1.2, qs[0].at - 3.1) : 1e9;
  const stackY0 = STACK_Y + ((6 - qs.length) * STACK_ROW) / 2; // the list stays centred on the mirror

  const rise = (p: number, px: number) => `translate(0 ${((1 - p) * px).toFixed(2)})`;
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <TextureGate />
      <Stage>
        {frame > 0 && (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              {[1, 2].map((d) => (
                <filter key={d} id={`${id}-sh${d}`} filterUnits="userSpaceOnUse" x="-300" y="-300" width="2520" height="1680">
                  <feDropShadow dx="0" dy={d === 2 ? 12 : 3} stdDeviation={d === 2 ? 14 : 4} floodColor="#1a0a0a" floodOpacity={d === 2 ? 0.24 : 0.2} />
                </filter>
              ))}
              <PaperTextureDefs id={id} strength={0.32} />
              <radialGradient id={`${id}-glass`} cx="0.42" cy="0.34" r="0.75">
                <stop offset="0" stopColor={D.paperLight} />
                <stop offset="0.7" stopColor={D.skyTint} />
                <stop offset="1" stopColor={P.sky} stopOpacity={0.85} />
              </radialGradient>
            </defs>
            <g filter={`url(#${id}-sh2)`} opacity={Math.min(1, frame * 1.8)} transform={rise(frame, 44)}>
              <path d={band(RX + MAT + FR, RY + MAT + FR, RX + MAT - 4, RY + MAT - 4)} fillRule="evenodd" fill={P.oxblood} filter={`url(#${id}-tex)`} />
            </g>
            <g filter={`url(#${id}-sh1)`} opacity={Math.min(1, mat * 2)} transform={rise(mat, 26)}>
              <path d={band(RX + MAT, RY + MAT, RX - 3, RY - 3)} fillRule="evenodd" fill={D.paperShade} filter={`url(#${id}-tex)`} />
            </g>
            <g opacity={glass}>
              <ellipse cx={MX} cy={MY} rx={RX} ry={RY} fill={`url(#${id}-glass)`} />
              {/* the cut edge of the mat throws a fine shadow onto the glass */}
              <ellipse cx={MX} cy={MY + 2} rx={RX - 1} ry={RY - 1} fill="none" stroke={P.oxblood} strokeOpacity={0.12} strokeWidth={4} />
            </g>
            {/* one still highlight, drawn once */}
            <path d={`M${MX - RX * 0.66},${MY - RY * 0.36} Q${MX - RX * 0.56},${MY - RY * 0.74} ${MX - RX * 0.16},${MY - RY * 0.86}`} stroke={D.paperLight} strokeWidth={9} strokeLinecap="round" fill="none"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - hi} opacity={0.85} />
          </svg>
        )}

        {/* title in the glass */}
        {title && (titleOut < 1 || titleBack) && (
          <div style={{ position: "absolute", left: MX - RX, width: 2 * RX, top: MY - 70, textAlign: "center", opacity: titleBack ? titleBackP : 1 - titleOut }}>
            <ScriptWord text={title.text} at={titleBack ? doneAt! : Math.max(title.at, mirrorAt + 0.8)} size={fit1(title.text, 92, 2 * RX - 80, 56, 0.46)} color={P.oxblood} style={{ display: "inline-block" }} />
          </div>
        )}

        {/* the question currently asked: in the glass */}
        {qs.map((q, i) => <Question key={i} q={q} n={i + 1} until={answeredAt[i]} />)}

        {/* the checklist: numbered rules set out ahead, each filled once its question is answered */}
        {qs.map((q, i) => (
          <StackRow key={i} n={i + 1} text={q.short} slotAt={slotsAt + i * 0.14} at={answeredAt[i]} y={stackY0 + i * STACK_ROW} size={stackSize} weight={w[i]} />
        ))}
      </Stage>
    </AbsoluteFill>
  );
};

type Q = SceneOf<"mirrorCheck">["props"]["questions"][number];

const Question: React.FC<{ q: Q; n: number; until: number }> = ({ q, n, until }) => {
  const t = useNarrationTime();
  const out = interpolate(t, [until - 0.3, until + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  const rule = useProgress(q.at, 0.9, ease.settle);
  if (t < q.at || out <= 0) return null;
  const notes = q.notes ?? [];
  const qW = 2 * RX - 150;
  const size = fitLines(q.text, [50, 46, 42, 38], qW, notes.length ? 4 : 5);
  const lines = Math.ceil((q.text.length * 0.56 * size) / (qW * 0.86));
  const qH = lines * size * 1.22;
  const top = notes.length ? MY - 196 : MY - qH / 2 + 30;
  return (
    <div style={{ opacity: out }}>
      <FocusIn at={q.at} dur={0.8} style={{ position: "absolute", left: MX - 60, width: 120, top: MY - RY + 78, textAlign: "center" }}>
        <span data-qa-text="" style={tracked(26, P.rose)}>{num(n)}</span>
      </FocusIn>
      <div style={{ position: "absolute", left: MX - 36 * rule, top: MY - RY + 124, width: 72 * rule, height: 1.5, background: P.rose, opacity: 0.7 }} />
      <FocusIn at={q.at + 0.1} style={{ position: "absolute", left: MX - qW / 2, top, width: qW, textAlign: "center" }}>
        <div data-qa-text="" style={txt(size, P.oxblood)}>{q.text}</div>
      </FocusIn>
      {notes.length > 0 && (
        <div style={{ position: "absolute", left: MX - 235, width: 470, top: MY + 108, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 30, rowGap: 8 }}>
          {notes.slice(0, 5).map((nt, k) => (
            <Ink key={k} at={nt.at} dur={inkDur(nt.text)}><span data-qa-text="" style={txt(34, D.royalDeep, { whiteSpace: "nowrap" })}>{nt.text}</span></Ink>
          ))}
        </div>
      )}
    </div>
  );
};

const StackRow: React.FC<{ n: number; text: string; slotAt: number; at: number; y: number; size: number; weight: number }> = ({ n, text, slotAt, at, y, size, weight }) => {
  const slot = useProgress(slotAt, 0.9, ease.settle);
  const filled = useProgress(at, 0.7, ease.settle);
  if (slot <= 0) return null;
  const numColor = filled > 0 ? P.rose : D.hairline;
  return (
    <div style={{ position: "absolute", left: STACK_X, top: y, width: STACK_W, height: 76, opacity: weight }}>
      <div style={{ position: "absolute", left: 0, top: 22, opacity: Math.min(1, slot * 2) }}>
        <span data-qa-text="" style={{ ...tracked(26, numColor), opacity: 0.6 + 0.4 * filled }}>{num(n)}</span>
      </div>
      <div style={{ position: "absolute", left: 0, top: 70, width: STACK_W * slot, height: 1.5, background: D.hairline }} />
      <Ink at={at + 0.1} dur={inkDur(text)} style={{ position: "absolute", left: 92, top: 62 - size * 1.18 }}>
        <span data-qa-text="" style={txt(size, P.oxblood, { whiteSpace: "nowrap" })}>{text}</span>
      </Ink>
    </div>
  );
};
