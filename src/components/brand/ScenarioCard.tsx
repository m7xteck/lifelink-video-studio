import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ease } from "../../brand/tokens";
import { useProgress, useSceneEnvelope } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";
import { D, FocusIn, Ink, P, SHADOW_1, SHADOW_2, ScriptWord, Stage, fit1, inkDur, tracked, txt } from "./stage";

/*
 * Signature: "Scenario card" — a case file: a cut-paper folder is laid down and a ruled case sheet lifts out of it.
 *   • folder + sheet arrive on `cardAt` (default: just before the ordinal is spoken; ≤ 70 px travel, no rotation)
 *   • the sheet is sized to its content (no surplus ruled rows) and centred; earlier cases are filed tabs on the folder
 *   • header: "Scenario" + script ordinal ("first") + the topic word, each on its cue
 *   • `situation` lines come into focus on the ruled lines as the situation is described
 *   • `avoid` (the unhealthy response) is written in muted ink and struck through on `strikeAt`
 *   • the "better response" fills the ruled lines below, one line inked per cue; `outcome` script closes it
 *   • `past`: earlier scenarios' topics as paper tabs beside the card (cumulative). Settled frames are still.
 *   • `note` (optional): a margin note written in the empty rows under the situation (rose margin rule, royal ink) while
 *     the situation lines dim; it clears before the response is written there.
 * Every line sits on a ruled row; rows never overlap (situation ≤ 3, response ≤ 3; spacer rows drop if needed).
 */
const CW = 1240, PAD = 80, HEAD = 244, FOOT = 60; // sheet-local
const TAB_H = 50;

/** Paper grain multiplied into a sheet (inside an overflow-hidden parent). */
const Grain: React.FC<{ opacity?: number; flip?: boolean }> = ({ opacity = 0.45, flip }) => (
  <Img src={staticFile("textures/paper-grain.png")} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, mixBlendMode: "multiply", opacity, transform: flip ? "scale(-1,1)" : undefined, pointerEvents: "none" }} />
);

export const ScenarioCard: React.FC<{ scene: SceneOf<"scenarioCard"> }> = ({ scene }) => {
  const { ordinal, topic, situation, avoid, response, responseLabel = "Better response", outcome, past = [], cardAt, note } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const arrive = cardAt ?? Math.max(scene.startSec, ordinal.at - 0.5);
  const folder = useProgress(arrive, 1.1, ease.settle);
  const card = useProgress(arrive + 0.25, 1.2, ease.settle);
  const red = useProgress(arrive + 0.6, 1.1, ease.settle);

  // row plan: only the rows this case needs
  type Row = { kind: "sit" | "avoid" | "label" | "resp" | "outcome" | "gap"; i?: number };
  const rows: Row[] = [
    ...situation.slice(0, 3).map((_, i) => ({ kind: "sit" as const, i })),
    ...(avoid ? [{ kind: "gap" as const }, { kind: "avoid" as const }] : []),
    ...(response.length ? [{ kind: "gap" as const }, { kind: "label" as const }] : []),
    ...response.slice(0, 3).map((_, i) => ({ kind: "resp" as const, i })),
    ...(outcome ? [{ kind: "outcome" as const }] : []),
  ];
  // a gap row is half height: a breath between the parts of the case, not an empty ruled line
  const units = rows.reduce((u, r) => u + (r.kind === "gap" ? 0.5 : r.kind === "outcome" ? 1.25 : 1), 0);
  const ROW = units > 8 ? 58 : 64; // a full case sheet stays clear of the frame edges
  const rowH = (r: Row) => (r.kind === "gap" ? ROW * 0.5 : r.kind === "outcome" ? ROW * 1.25 : ROW);
  const rowBase: number[] = [];
  let y = HEAD;
  for (const r of rows) { y += rowH(r); rowBase.push(y); }
  const CH = y + FOOT;
  const x0 = (1920 - CW) / 2;
  const CY = Math.round((1080 - CH) / 2 + TAB_H / 2);
  const lineW = CW - PAD * 2;
  const bodySize = Math.min(40, ...situation.map((s) => fit1(s.text, 40, lineW, 28)), ...response.map((s) => fit1(s.text, 40, lineW, 28)));
  const avoidSize = avoid ? fit1(avoid.text, 36, lineW - 150, 26) : 36;
  const strike = useProgress(avoid?.strikeAt ?? (avoid ? avoid.at + inkDur(avoid.text) + 0.4 : 1e9), 0.7, ease.settle);
  const topicSize = topic ? fit1(topic.text, 64, 640, 36) : 64;
  // margin note: in the rows below the situation, until the response part begins
  const noteUntil = note ? note.until ?? Math.min(avoid?.at ?? Infinity, response[0]?.at ?? Infinity, scene.endSec) - 0.3 : 1e9;
  const noteIn = useProgress(note?.at ?? 1e9, 1.0, ease.settle);
  const noteOut = useProgress(noteUntil - 0.5, 0.5, ease.settle);
  const noteOn = noteIn * (1 - noteOut);
  const noteLines = note ? note.text.split("\n") : [];
  const noteSize = Math.min(32, ...noteLines.map((l) => fit1(l, 32, lineW - 60, 28))); // two lines fit between the situation rule and the next rule
  const sitDim = 1 - 0.55 * noteOn;

  // folder: back panel a little larger than the sheet, with the case tab (left) and earlier cases' tabs (right)
  const FX = x0 - 40, FY = CY - 30, FW = CW + 80, FH = CH + 58;
  const tabs = past.slice(0, 4).reverse().map((p) => ({ p, w: Math.round(fit1(p, 26, 260, 20) * p.length * 0.56 + 56) }));
  let tx = FX + FW - 28;
  const tabX = tabs.map((tb) => (tx -= tb.w + 12) + 12);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {folder > 0 && (
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: Math.min(1, folder * 2), transform: `translateY(${((1 - folder) * 50).toFixed(2)}px)`, filter: SHADOW_1 }}>
            {/* case tab */}
            <div style={{ position: "absolute", left: FX + 28, top: FY - TAB_H + 4, width: 250, height: TAB_H, background: D.paperShade, borderRadius: "6px 6px 0 0", overflow: "hidden" }}>
              <Grain opacity={0.5} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 14, textAlign: "center", ...tracked(22, D.oxbloodMuted) }}><span data-qa-text="">Scenario</span></div>
            </div>
            {/* earlier cases, filed */}
            {tabs.map((tb, i) => (
              <div key={i} style={{ position: "absolute", left: tabX[i], top: FY - TAB_H + 10, width: tb.w, height: TAB_H - 6, background: D.hairline, borderRadius: "6px 6px 0 0", overflow: "hidden" }}>
                <Grain opacity={0.45} flip />
                <div data-qa-text="" style={txt(fit1(tb.p, 26, 260, 22), D.oxbloodMuted, { position: "absolute", left: 0, right: 0, top: 7, textAlign: "center", whiteSpace: "nowrap" })}>{tb.p}</div>
              </div>
            ))}
            <div style={{ position: "absolute", left: FX, top: FY, width: FW, height: FH, background: D.paperShade, borderRadius: 6, overflow: "hidden" }}><Grain opacity={0.5} /></div>
          </div>
        )}

        {card > 0 && (
          <div style={{ position: "absolute", left: x0, top: CY, width: CW, height: CH, opacity: Math.min(1, card * 2), transform: `translateY(${((1 - card) * 70).toFixed(2)}px)`, filter: SHADOW_2 }}>
            <div style={{ position: "absolute", inset: 0, background: D.paperLight, borderRadius: 3, overflow: "hidden" }}><Grain opacity={0.3} flip /></div>
            {/* ruled lines under the rows in use, and a fine double rule under the header (case-sheet form) */}
            <svg width={CW} height={CH} style={{ position: "absolute", inset: 0 }}>
              {rows.map((r, k) => (r.kind === "gap" || r.kind === "outcome" ? null : <line key={k} x1={PAD - 16} x2={CW - PAD + 16} y1={rowBase[k]} y2={rowBase[k]} stroke={P.sky} strokeWidth={1.2} opacity={0.55 * red} />))}
              <line x1={PAD - 16} x2={PAD - 16 + (CW - 2 * PAD + 32) * red} y1={HEAD - 52} y2={HEAD - 52} stroke={P.rose} strokeWidth={2} />
              <line x1={PAD - 16} x2={PAD - 16 + (CW - 2 * PAD + 32) * red} y1={HEAD - 46} y2={HEAD - 46} stroke={P.rose} strokeWidth={0.9} />
            </svg>
            {/* header: ordinal (script) · topic */}
            <ScriptWord text={ordinal.text} at={ordinal.at} size={84} color={P.oxblood} style={{ position: "absolute", left: PAD - 10, top: 50 }} />
            {topic && (
              <Ink at={topic.at} dur={inkDur(topic.text)} style={{ position: "absolute", right: PAD, top: 92, textAlign: "right" }}>
                <span data-qa-text="" style={txt(topicSize, P.royal, { whiteSpace: "nowrap" })}>{topic.text}</span>
              </Ink>
            )}
            {rows.map((r, k) => {
              const base = rowBase[k]; // the rule this row sits on
              if (r.kind === "sit") {
                const s = situation[r.i!];
                return <FocusIn key={k} at={s.at} style={{ position: "absolute", left: PAD, top: base - bodySize * 1.12 - 8 }}><div data-qa-text="" style={txt(bodySize, P.oxblood, { whiteSpace: "nowrap", opacity: sitDim })}>{s.text}</div></FocusIn>;
              }
              if (r.kind === "avoid" && avoid) {
                return (
                  <div key={k} style={{ position: "absolute", left: PAD, top: base - avoidSize * 1.12 - 8, display: "flex", alignItems: "baseline", gap: 24 }}>
                    <Ink at={avoid.at} dur={0.6}><span data-qa-text="" style={tracked(22, P.rose)}>Avoid</span></Ink>
                    <Ink at={avoid.at + 0.2} dur={inkDur(avoid.text)}>
                      <span style={{ position: "relative", display: "inline-block" }}>
                        <span data-qa-text="" style={txt(avoidSize, D.oxbloodMuted, { whiteSpace: "nowrap" })}>{avoid.text}</span>
                        {strike > 0 && <span style={{ position: "absolute", left: -6, top: "56%", height: 2.5, width: `calc(${(strike * 100).toFixed(2)}% + ${(12 * strike).toFixed(2)}px)`, background: P.rose }} />}
                      </span>
                    </Ink>
                  </div>
                );
              }
              if (r.kind === "label") return <Ink key={k} at={response[0].at - 0.2} dur={0.8} style={{ position: "absolute", left: PAD, top: base - 36 }}><span data-qa-text="" style={tracked(22, P.royal)}>{responseLabel}</span></Ink>;
              if (r.kind === "resp") {
                const s = response[r.i!];
                return <Ink key={k} at={s.at} dur={inkDur(s.text)} style={{ position: "absolute", left: PAD, top: base - bodySize * 1.12 - 8 }}><div data-qa-text="" style={txt(bodySize, D.royalDeep, { whiteSpace: "nowrap" })}>{s.text}</div></Ink>;
              }
              if (r.kind === "outcome" && outcome) return <ScriptWord key={k} text={outcome.text} at={outcome.at} size={62} color={P.oxblood} style={{ position: "absolute", right: PAD - 10, top: base - 88 }} />;
              return null;
            })}
            {note && noteOn > 0 && (
              <div style={{ position: "absolute", left: PAD, top: rowBase[Math.min(situation.length, 3) - 1] + 6, opacity: noteOn, transform: `translateY(${((1 - noteIn) * 10).toFixed(2)}px)` }}>
                <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: P.rose, transformOrigin: "top", transform: `scaleY(${noteIn.toFixed(3)})` }} />
                <Ink at={note.at + 0.15} dur={Math.min(1.6, 0.6 + note.text.length * 0.02)} style={{ paddingLeft: 30 }}>
                  {noteLines.map((l, i) => <div key={i} data-qa-text="" style={txt(noteSize, D.royalDeep, { whiteSpace: "nowrap", lineHeight: 1.22 })}>{l}</div>)}
                </Ink>
              </div>
            )}
          </div>
        )}
      </Stage>
    </AbsoluteFill>
  );
};
