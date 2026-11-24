import React from "react";
import { AbsoluteFill } from "remotion";
import { ease } from "../../brand/tokens";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, SHADOW_1, SHADOW_2, ScriptWord, Stage, fit1, inkDur, tracked, txt } from "./stage";

/*
 * Signature: "Scenario card" — a ruled index card (rose header rule, sky ruled lines) for a worked scenario.
 *   • the card slides up (≤ 110 px, no rotation) on `cardAt` (default: just before the ordinal is spoken)
 *   • header: "Scenario" + script ordinal ("first") + the topic word, each on its cue
 *   • `situation` lines come into focus on the ruled lines as the situation is described
 *   • `avoid` (the unhealthy response) is written in muted ink and struck through on `strikeAt`
 *   • the "better response" fills the ruled lines below, one line inked per cue; `outcome` script closes it
 *   • `past`: earlier scenarios' topics as paper tabs beside the card (cumulative). Settled frames are still.
 * Every line sits on a ruled row; rows never overlap (situation ≤ 3, response ≤ 3; spacer rows drop if needed).
 */
const CW = 1320, CH = 862, CY = 108;
const RED_Y = 222, ROW0 = 312, ROW = 62, ROWS = 9, PAD = 72; // card-local

export const ScenarioCard: React.FC<{ scene: SceneOf<"scenarioCard"> }> = ({ scene }) => {
  const { ordinal, topic, situation, avoid, response, responseLabel = "Better response", outcome, past = [], cardAt } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const arrive = cardAt ?? Math.max(scene.startSec, ordinal.at - 0.5);
  const card = useProgress(arrive, 1.3, ease.settle);
  const red = useProgress(arrive + 0.4, 1.1, ease.settle);
  const cx0 = past.length ? 200 : (1920 - CW) / 2;

  // row plan
  type Row = { kind: "sit" | "avoid" | "label" | "resp" | "outcome" | "gap"; i?: number };
  let rows: Row[] = [
    ...situation.slice(0, 3).map((_, i) => ({ kind: "sit" as const, i })),
    { kind: "gap" },
    ...(avoid ? [{ kind: "avoid" as const }, { kind: "gap" as const }] : []),
    ...(response.length ? [{ kind: "label" as const }] : []),
    ...response.slice(0, 3).map((_, i) => ({ kind: "resp" as const, i })),
    ...(outcome ? [{ kind: "outcome" as const }] : []),
  ];
  while (rows.length > ROWS && rows.some((r) => r.kind === "gap")) rows.splice(rows.findIndex((r) => r.kind === "gap"), 1);
  rows = rows.slice(0, ROWS);
  const lineW = CW - PAD * 2;
  const bodySize = Math.min(40, ...situation.map((s) => fit1(s.text, 40, lineW, 28)), ...response.map((s) => fit1(s.text, 40, lineW, 28)));
  const avoidSize = avoid ? fit1(avoid.text, 34, lineW - 150, 26) : 34;
  const strike = useProgress(avoid?.strikeAt ?? (avoid ? avoid.at + inkDur(avoid.text) + 0.4 : 1e9), 0.7, ease.settle);
  const topicSize = topic ? fit1(topic.text, 62, 640, 36) : 62;

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {/* earlier scenarios: tabs beside the card */}
        {past.slice(0, 4).map((p, i) => (
          <div key={i} style={{ position: "absolute", left: cx0 + CW + 40, top: CY + 40 + i * 76, width: 300, height: 58, filter: SHADOW_1 }}>
            <div style={{ position: "absolute", inset: 0, background: D.paperShade, borderRadius: 3, borderLeft: `6px solid ${P.sky}` }} />
            <div data-qa-text="" style={txt(fit1(p, 28, 250, 22), D.oxbloodMuted, { position: "absolute", left: 26, top: 13, whiteSpace: "nowrap" })}>{p}</div>
          </div>
        ))}

        {card > 0 && (
          <div style={{ position: "absolute", left: cx0, top: CY, width: CW, height: CH, opacity: Math.min(1, card * 4), transform: `translateY(${((1 - card) * 110).toFixed(2)}px)`, filter: SHADOW_2 }}>
            <div style={{ position: "absolute", inset: 0, background: D.paperLight, borderRadius: 6 }} />
            {/* ruled lines (index card) */}
            <svg width={CW} height={CH} style={{ position: "absolute", inset: 0 }}>
              {Array.from({ length: ROWS }, (_, k) => <line key={k} x1={0} x2={CW} y1={ROW0 + k * ROW} y2={ROW0 + k * ROW} stroke={P.sky} strokeWidth={1.5} opacity={0.75} />)}
              <line x1={0} x2={CW * red} y1={RED_Y} y2={RED_Y} stroke={P.rose} strokeWidth={2.5} />
            </svg>
            {/* header */}
            <div style={{ position: "absolute", left: PAD, top: 40, ...tracked(24, D.oxbloodMuted), opacity: Math.min(1, card * 3) }}><span data-qa-text="">Scenario</span></div>
            <ScriptWord text={ordinal.text} at={ordinal.at} size={78} color={P.oxblood} style={{ position: "absolute", left: PAD - 8, top: 62 }} />
            {topic && (
              <Ink at={topic.at} dur={inkDur(topic.text)} style={{ position: "absolute", right: PAD, top: 104, textAlign: "right" }}>
                <span data-qa-text="" style={txt(topicSize, P.royal, { whiteSpace: "nowrap" })}>{topic.text}</span>
              </Ink>
            )}
            {rows.map((r, k) => {
              const base = ROW0 + k * ROW; // the rule this row sits on
              if (r.kind === "sit") {
                const s = situation[r.i!];
                return <FocusIn key={k} at={s.at} style={{ position: "absolute", left: PAD, top: base - bodySize * 1.12 - 6 }}><div data-qa-text="" style={txt(bodySize, P.oxblood, { whiteSpace: "nowrap" })}>{s.text}</div></FocusIn>;
              }
              if (r.kind === "avoid" && avoid) {
                return (
                  <div key={k} style={{ position: "absolute", left: PAD, top: base - avoidSize * 1.12 - 6, display: "flex", alignItems: "baseline", gap: 22 }}>
                    <Ink at={avoid.at} dur={0.6}><span data-qa-text="" style={tracked(22, P.rose)}>Avoid</span></Ink>
                    <Ink at={avoid.at + 0.2} dur={inkDur(avoid.text)}>
                      <span style={{ position: "relative", display: "inline-block" }}>
                        <span data-qa-text="" style={txt(avoidSize, D.oxbloodMuted, { whiteSpace: "nowrap" })}>{avoid.text}</span>
                        {strike > 0 && <span style={{ position: "absolute", left: -6, top: "54%", height: 3, width: `calc(${(strike * 100).toFixed(2)}% + ${(12 * strike).toFixed(2)}px)`, background: P.rose }} />}
                      </span>
                    </Ink>
                  </div>
                );
              }
              if (r.kind === "label") return <Ink key={k} at={response[0].at - 0.2} dur={0.8} style={{ position: "absolute", left: PAD, top: base - 34 }}><span data-qa-text="" style={tracked(24, P.royal)}>{responseLabel}</span></Ink>;
              if (r.kind === "resp") {
                const s = response[r.i!];
                return <Ink key={k} at={s.at} dur={inkDur(s.text)} style={{ position: "absolute", left: PAD, top: base - bodySize * 1.12 - 6 }}><div data-qa-text="" style={txt(bodySize, D.royalDeep, { whiteSpace: "nowrap" })}>{s.text}</div></Ink>;
              }
              if (r.kind === "outcome" && outcome) return <ScriptWord key={k} text={outcome.text} at={outcome.at} size={60} color={P.oxblood} style={{ position: "absolute", right: PAD - 8, top: base - 84 }} />;
              return null;
            })}
          </div>
        )}
      </Stage>
    </AbsoluteFill>
  );
};
