import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { PaperGround, Rule, Script, avoidScript } from "../../motion/brand";
import { useLayout } from "../../motion/layout";
import { useGroundEnvelope, useLeadIn, useNarrationTime, useProgress } from "../../motion/time";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived;

/**
 * Concept 4: Reflective moment, "Oxblood Stillness".
 * Deep oxblood field, generous space, almost no motion. Lines arrive softly; one phrase is
 * set in script. A single hairline ring draws slowly through the hold, and only at the very
 * end does a second ring quietly join it.
 * Brightness (v004 review): built as paper underlay + coloured ground + type, so the ground rises from paper over 2 s on an
 * even curve and is held while the next scene rises over it (useGroundEnvelope); the first line enters with the narrator's
 * first words, never after seconds of empty colour.
 */
export const ReflectionField: React.FC<{ scene: SceneOf<"reflectionField"> }> = ({ scene }) => {
  const { lines, script, after, ground } = scene.props;
  const L = useLayout();
  const env = useGroundEnvelope(); // full-colour ground: even 2 s brightness change both ways
  const t = useNarrationTime();
  const line0At = useLeadIn(scene, lines[0].at);
  // short words / negations never in Script: the phrase is set in the text face, sky ink
  const scriptAsText = !!script && avoidScript(script.text);
  const base = ground === "royal" ? P.royal : P.oxblood;
  const deep = ground === "royal" ? D.royalDeep : D.oxbloodDeep;
  const breathe = 0.5 + 0.5 * Math.sin((t - scene.startSec) * 0.5);

  return (
    <AbsoluteFill style={{ opacity: env.wrap }}>
      <PaperGround color={P.paper} deep={D.paperShade} seed={13} />
      <AbsoluteFill style={{ opacity: env.ground }}>
        <PaperGround color={base} grain={0.12} seed={31} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 70% at 40% 48%, transparent 30%, ${deep} 100%)`, opacity: 0.75 + 0.15 * breathe }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: L.portrait ? "flex-end" : "center", padding: `${L.safeY * 1.4}px ${L.safeX * 1.3}px`, opacity: env.content }}>
        <div style={{ maxWidth: L.portrait ? L.innerW : L.innerW * 0.74 }}>
          {lines.map((ln, i) => <Line key={i} text={ln.text} at={i === 0 ? line0At : ln.at} size={L.size("h2")} />)}
          {script && scriptAsText && <Line text={script.text} at={script.at} size={L.size("h2")} color={P.sky} />}
          {script && !scriptAsText && (
            <div style={{ marginTop: 6 * L.u, marginLeft: -6 * L.u }}>
              <Script text={script.text} at={script.at} size={Math.round(112 * L.u)} color={P.sky} dur={1.8} />
              <Rule at={script.at + 1.2} length={180 * L.u} color={P.sky} thickness={1.2} dur={2.4} style={{ marginTop: -6 * L.u, marginBottom: 22 * L.u, marginLeft: 8 * L.u, opacity: 0.6 }} />
            </div>
          )}
          {after?.map((ln, i) => <Line key={`a${i}`} text={ln.text} at={ln.at} size={L.size("h2")} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Line: React.FC<{ text: string; at: number; size: number; color?: string }> = ({ text, at, size, color = P.paper }) => {
  // legible within ~0.4 s of the cue (was a 1.8 s pull that only read ~1 s after the word)
  const p = useProgress(at - 0.15, 1.2, ease.settle);
  return (
    <div data-qa-text="" style={{
      fontFamily: fonts.text, fontSize: size, lineHeight: 1.28, color, wordSpacing: textStyle.wordSpacing, whiteSpace: "nowrap", // line breaks are authored in the manifest
      opacity: p, filter: `blur(${(1 - p) * 6}px)`, letterSpacing: `${(1 - p) * 0.03 - 0.005}em`, marginBottom: size * 0.12,
    }}>{text}</div>
  );
};
