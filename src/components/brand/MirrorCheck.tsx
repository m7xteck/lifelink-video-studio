import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { ease } from "../../brand/tokens";
import { focusWeights } from "../../motion/focus";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, SHADOW_1, ScriptWord, Stage, fit1, fitLines, inkDur, txt } from "./stage";

/*
 * Signature: "Mirror check" — an oval paper mirror; each question appears inside the glass (looking inward)
 * and, once the next question is asked, the answered question is filed as a short line in a numbered stack beside it.
 *   • the frame is cut on `mirrorAt`; one soft light pass crosses the glass as it settles (the mirror "catches the light")
 *   • `title` (script, e.g. "mirror check") is inked in the glass until the first question, and returns on `doneAt`
 *   • each question comes into focus in the glass on its cue, with its number; optional spoken `notes` ink in below
 *   • the stack row (number + `short`) is inked when the question is answered (next question's cue / `doneAt`)
 *   • `focus` dims the other stack rows for revisits. Settled frames are still.
 */
const MX = 620, MY = 540, RX = 318, RY = 404, FR = 30;
const STACK_X = 1100, STACK_Y = 196, STACK_ROW = 116;

export const MirrorCheck: React.FC<{ scene: SceneOf<"mirrorCheck"> }> = ({ scene }) => {
  const { mirrorAt, title, questions, doneAt, focus } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `mc-${scene.id}`;
  const frame = useProgress(mirrorAt, 1.4, ease.settle);
  const sheen = useProgress(mirrorAt + 0.5, 1.8, ease.settle);
  const qs = questions.slice(0, 6);
  const answeredAt = qs.map((_, i) => (i < qs.length - 1 ? qs[i + 1].at : doneAt ?? 1e9));
  const w = focusWeights(qs.length, focus, t);
  const titleOut = useProgress(qs.length ? qs[0].at - 0.4 : 1e9, 0.6, ease.settle);
  const titleBackP = useProgress(doneAt ?? 1e9, 0.8, ease.settle);
  const titleBack = doneAt != null && t >= doneAt;
  const stackSize = Math.min(44, ...qs.map((q) => fit1(q.short, 44, 1820 - STACK_X - 90, 28)));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {frame > 0 && (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id={`${id}-sh`} filterUnits="userSpaceOnUse" x="-300" y="-300" width="2520" height="1680">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#1a0a0a" floodOpacity="0.22" />
              </filter>
              <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0" stopColor={D.paperLight} />
                <stop offset="0.55" stopColor={D.skyTint} />
                <stop offset="1" stopColor={P.sky} stopOpacity={0.8} />
              </linearGradient>
              <clipPath id={`${id}-clip`}><ellipse cx={MX} cy={MY} rx={RX} ry={RY} /></clipPath>
            </defs>
            <g opacity={Math.min(1, frame * 4)} transform={`translate(0 ${((1 - frame) * 50).toFixed(2)})`}>
              <ellipse cx={MX} cy={MY} rx={RX + FR} ry={RY + FR} fill={P.oxblood} filter={`url(#${id}-sh)`} />
              <ellipse cx={MX} cy={MY} rx={RX + 9} ry={RY + 9} fill="none" stroke={P.rose} strokeWidth={3} />
              <ellipse cx={MX} cy={MY} rx={RX} ry={RY} fill={`url(#${id}-glass)`} />
              {/* one light pass across the glass, then still */}
              {sheen > 0 && sheen < 1 && (
                <g clipPath={`url(#${id}-clip)`}>
                  <rect x={MX - RX - 260 + (2 * RX + 520) * sheen} y={MY - RY - 60} width={120} height={2 * RY + 120} fill={D.paperLight} opacity={0.55 * Math.sin(Math.PI * sheen)} transform={`skewX(-18)`} style={{ transformOrigin: `${MX}px ${MY}px` }} />
                </g>
              )}
              {/* a fixed, faint reflection: two static highlights */}
              <path d={`M${MX - RX * 0.62},${MY - RY * 0.42} Q${MX - RX * 0.5},${MY - RY * 0.78} ${MX - RX * 0.12},${MY - RY * 0.86}`} stroke={D.paperLight} strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.7 * Math.min(1, sheen * 2)} />
            </g>
          </svg>
        )}

        {/* title in the glass */}
        {title && (titleOut < 1 || titleBack) && (
          <div style={{ position: "absolute", left: MX - RX, width: 2 * RX, top: MY - 70, textAlign: "center", opacity: titleBack ? titleBackP : 1 - titleOut }}>
            <ScriptWord text={title.text} at={titleBack ? doneAt! : title.at} size={fit1(title.text, 92, 2 * RX - 80, 56, 0.46)} color={P.oxblood} style={{ display: "inline-block" }} />
          </div>
        )}

        {/* the question currently asked: in the glass */}
        {qs.map((q, i) => <Question key={i} q={q} n={i + 1} until={answeredAt[i]} />)}

        {/* answered questions, filed beside the mirror */}
        {qs.map((q, i) => (
          <StackRow key={i} n={i + 1} text={q.short} at={answeredAt[i]} y={STACK_Y + i * STACK_ROW} size={stackSize} weight={w[i]} />
        ))}
      </Stage>
    </AbsoluteFill>
  );
};

type Q = SceneOf<"mirrorCheck">["props"]["questions"][number];

const Question: React.FC<{ q: Q; n: number; until: number }> = ({ q, n, until }) => {
  const t = useNarrationTime();
  const out = interpolate(t, [until - 0.3, until + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  if (t < q.at || out <= 0) return null;
  const notes = q.notes ?? [];
  const qW = 2 * RX - 150;
  const size = fitLines(q.text, [50, 46, 42, 38], qW, notes.length ? 4 : 5);
  const lines = Math.ceil((q.text.length * 0.56 * size) / (qW * 0.86));
  const qH = lines * size * 1.22;
  const top = notes.length ? MY - 210 : MY - qH / 2 + 30;
  return (
    <div style={{ opacity: out }}>
      <FocusIn at={q.at} dur={0.8} style={{ position: "absolute", left: MX - 26, top: MY - RY + 62, width: 52, height: 52 }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: P.rose, filter: SHADOW_1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span data-qa-text="" style={txt(28, D.paperLight, { lineHeight: 1 })}>{n}</span>
        </div>
      </FocusIn>
      <FocusIn at={q.at + 0.1} style={{ position: "absolute", left: MX - qW / 2, top, width: qW, textAlign: "center" }}>
        <div data-qa-text="" style={txt(size, P.oxblood)}>{q.text}</div>
      </FocusIn>
      {notes.length > 0 && (
        <div style={{ position: "absolute", left: MX - 245, width: 490, top: MY + 104, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 30, rowGap: 8 }}>
          {notes.slice(0, 5).map((nt, k) => (
            <Ink key={k} at={nt.at} dur={inkDur(nt.text)}><span data-qa-text="" style={txt(34, D.royalDeep, { whiteSpace: "nowrap" })}>{nt.text}</span></Ink>
          ))}
        </div>
      )}
    </div>
  );
};

const StackRow: React.FC<{ n: number; text: string; at: number; y: number; size: number; weight: number }> = ({ n, text, at, y, size, weight }) => {
  const p = useProgress(at, 0.9, ease.settle);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: STACK_X, top: y, height: 72, display: "flex", alignItems: "center", gap: 30, opacity: weight }}>
      <div style={{ width: 52, height: 52, flex: "none", borderRadius: 26, background: P.rose, filter: SHADOW_1, opacity: Math.min(1, p * 3), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span data-qa-text="" style={txt(28, D.paperLight, { lineHeight: 1 })}>{n}</span>
      </div>
      <Ink at={at + 0.15} dur={inkDur(text)}><span data-qa-text="" style={txt(size, P.oxblood, { whiteSpace: "nowrap" })}>{text}</span></Ink>
    </div>
  );
};
