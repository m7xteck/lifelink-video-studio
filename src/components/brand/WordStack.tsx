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
 * "Word stack": 2–4 key words (a list of qualities) stacked big and left-aligned. As each word is
 * spoken a small cut-paper tab lands and the word slides out from behind it; the word being spoken
 * is in full ink, words already said settle to the muted ink so the eye follows the narration.
 * An optional plain lead-in sentence sits in its own column at the left. No kicker, no rule.
 */
export const WordStack: React.FC<{ scene: SceneOf<"wordStack"> }> = ({ scene }) => {
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
          fontFamily: fonts.text, fontSize: L.size("h3"), lineHeight: 1.3, color: D.oxbloodMuted, wordSpacing: textStyle.wordSpacing, opacity: leadP,
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
