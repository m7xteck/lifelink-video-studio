import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import type { SceneOf } from "../../schema/manifest";
import { scriptGap } from "./scriptText";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Iceberg" — public vs private character.
 *   • the peak (large, centred: a composed frame from the start) emerges on `peakAt`; public traits ink in beside it on their cues
 *   • the waterline draws across the frame on `waterlineAt`, the water filling behind the pen
 *   • on `massAt` ("at home") the water clears downward to reveal the far larger hidden mass;
 *     private situations come into focus inside it on their cues; a few still highlights set on the water surface
 *   • ice and water carry paper grain; zone labels share one left margin above and below the water
 *   • `focus` 0 = above the water, 1 = below (other half dims); settled frames are still.
 * Geometry is fixed on a 1920×1080 artboard; peak and mass share the waterline edge exactly.
 */
const WL = 476;           // waterline
// a large tip, composed in the centre of the frame from the first second (it is the whole picture until "at home")
const PEAK = "M770,476 L862,328 L914,354 L985,150 L1062,286 L1108,258 L1190,476 Z";
const PEAK_FACET = "M985,150 L1062,286 L1108,258 L1190,476 L1012,476 L1000,300 Z";
const PEAK_EDGE = "M770,476 L862,328 L914,354 L985,150";
const MASS = "M770,476 L1190,476 L1384,542 L1532,664 L1520,824 L1392,952 L1150,1030 L858,1028 L620,960 L462,832 L432,682 L560,560 Z";
const MASS_FACET = "M1190,476 L1384,542 L1532,664 L1520,824 L1392,952 L1150,1030 L1236,800 L1260,580 Z";
const MASS_BOTTOM = 1030;
// public traits: alternate left / right of the peak, two rows
const ABOVE = [
  { x: 770, y: 300, anchor: "end" as const }, { x: 1196, y: 300, anchor: "start" as const },
  { x: 730, y: 412, anchor: "end" as const }, { x: 1236, y: 412, anchor: "start" as const },
];
// private situations: 2×2 inside the mass
const BELOW = [{ x: 760, y: 712 }, { x: 1196, y: 712 }, { x: 760, y: 868 }, { x: 1196, y: 868 }];
// zone labels: one editorial margin at the left, above and below the water
const ZONE_X = 140, ZONE_ABOVE_Y = 214, ZONE_BELOW_Y = 610;
// still highlights on the water surface, set only when the hidden mass is revealed
const GLINTS = [{ x: 180, y: 506, w: 220 }, { x: 1480, y: 500, w: 260 }, { x: 330, y: 534, w: 120 }, { x: 1620, y: 530, w: 140 }];


const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const Iceberg: React.FC<{ scene: SceneOf<"iceberg"> }> = ({ scene }) => {
  const { peakAt, waterlineAt, massAt, above = [], below = [], aboveLabel, belowLabel, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `ib-${scene.id}`;
  // a RETURN (every part cued together at the scene start) opens on the complete, still iceberg at full geometry:
  // sea, mass, peak and the already-established labels crossfade in with the scene (plus a short eased rise);
  // the first-time sea wipe and clip reveals are never replayed inside the fade
  const revisit = Math.abs(massAt - peakAt) < 1 && Math.abs(waterlineAt - peakAt) < 1;
  const settled = (at: number) => revisit && at <= scene.startSec + 0.6;
  const peakP = useProgress(peakAt, 1.5, ease.settle);
  const peak = revisit ? 1 : peakP;
  const waterP = useProgress(waterlineAt, 1.8, ease.settle);
  const water = revisit ? 1 : waterP;
  const massP = useProgress(massAt, 2.0, ease.settle);
  const mass = revisit ? 1 : massP;
  const rise = revisit ? 16 * (1 - env.inP) : 0;
  // camera: while only the tip is shown, the view sits 150 px lower so the tip is centred in the frame; it lifts with the
  // reveal of the hidden mass ("at home"). Revisits that open fully built start at the final view.
  const lift = useProgress(massAt - 0.3, 2.4, ease.settle);
  const camY = massAt - peakAt < 1 ? 0 : 150 * (1 - lift);
  const w = focusWeights(2, focus, t);
  const aboveSize = Math.max(30, Math.min(40, ...above.slice(0, 4).map((a) => fit(a.text, 40, 540))));
  const belowSize = Math.max(30, Math.min(38, ...below.slice(0, 4).map((b) => fit(b.text, 38, 400))));
  const glintP = useProgress(massAt + 0.6, 1.6, ease.settle);
  const glint = revisit ? 1 : glintP;

  return (
    <AbsoluteFill style={{ opacity: env.opacity, wordSpacing: textStyle.wordSpacing }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <g transform={`translate(0 ${(camY + rise).toFixed(2)})`}>
        <defs>
          <PaperTextureDefs id={id} strength={0.24} />
          <clipPath id={`${id}-sky`}><rect x={0} y={0} width={1920} height={WL} /></clipPath>
          <clipPath id={`${id}-mass`}><rect x={0} y={WL} width={1920} height={(MASS_BOTTOM - WL + 20) * mass} /></clipPath>
          <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.sky} />
            <stop offset="1" stopColor={D.hillFar} />
          </linearGradient>
        </defs>

        {/* water body: deepens in as the waterline draws */}
        {water > 0 && (
          <g opacity={water}>
            <rect x={0} y={WL} width={1920 * water} height={1080 - WL + 160} fill={`url(#${id}-depth)`} filter={`url(#${id}-tex)`} />
          </g>
        )}
        {glint > 0 && GLINTS.map((g, i) => (
          <path key={i} d={`M${g.x},${g.y} L${g.x + g.w},${g.y}`} stroke={D.paperLight} strokeWidth={2} strokeLinecap="round" opacity={0.5 * glint}
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - glint} fill="none" />
        ))}

        {/* hidden mass: revealed top-down on "at home" (opacity follows focus) */}
        {mass > 0 && (
          <g clipPath={`url(#${id}-mass)`} opacity={0.35 + 0.65 * w[1]}>
            <path d={MASS} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
            <g filter={`url(#${id}-tex)`}>
              <path d={MASS} fill={D.paperLight} />
              <path d={MASS_FACET} fill={D.skyTint} opacity={0.7} />
            </g>
          </g>
        )}

        {/* peak: emerges from the waterline */}
        {peak > 0 && (
          <g clipPath={`url(#${id}-sky)`} opacity={Math.min(1, peak * 4) * (0.35 + 0.65 * w[0])}>
            <g transform={`translate(0 ${((1 - peak) * 150).toFixed(2)})`}>
              <path d={PEAK} fill={D.paperLight} filter={`url(#${id}-shadow-3)`} />
              <g filter={`url(#${id}-tex)`}>
                <path d={PEAK} fill={D.paperLight} />
                <path d={PEAK_FACET} fill={D.skyTint} />
              </g>
              {/* fine cut edge on the lit side */}
              <path d={PEAK_EDGE} stroke={D.paperLight} strokeWidth={2} fill="none" strokeLinejoin="round" opacity={0.9} />
            </g>
          </g>
        )}

        {/* before the water: the tip stands on a short hairline (the surface, implied); the waterline replaces it */}
        {peak > 0 && water < 1 && (
          <path d={`M700,${WL} L1260,${WL}`} stroke={D.hairline} strokeWidth={2} fill="none" opacity={Math.min(1, peak * 2) * (1 - water)} />
        )}
        {/* waterline: one ink stroke, left → right */}
        {water > 0 && (
          <path d={`M0,${WL} L1920,${WL}`} stroke={D.royalDeep} strokeWidth={3} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - water} />
        )}

        {/* labels */}
        <g opacity={0.45 + 0.55 * w[0]}>
          {aboveLabel && <ZoneLabel id={`${id}-al`} label={aboveLabel} openAt={scene.startSec} instant={settled} x={ZONE_X} y={ZONE_ABOVE_Y} />}
          {above.slice(0, 4).map((a, i) => <InkText key={i} id={`${id}-a${i}`} text={a.text} at={a.at} instant={settled(a.at)} size={aboveSize} {...ABOVE[i]} />)}
        </g>
        <g opacity={0.45 + 0.55 * w[1]}>
          {belowLabel && <ZoneLabel id={`${id}-bl`} label={{ ...belowLabel, at: settled(belowLabel.at) ? belowLabel.at : Math.max(belowLabel.at, massAt + 0.6) }} openAt={scene.startSec} instant={settled} x={ZONE_X} y={ZONE_BELOW_Y} />}
          {below.slice(0, 4).map((b, i) => <FocusText key={i} text={b.text} at={settled(b.at) ? b.at : Math.max(b.at, massAt + 0.8)} instant={settled(b.at)} size={belowSize} {...BELOW[i]} />)}
        </g>
        </g>
      </svg>
      <TextureGate />
    </AbsoluteFill>
  );
};

/** Text inked left→right (or right→left for end-anchored labels, so the pen moves away from the peak). */
const InkText: React.FC<{ id: string; text: string; at: number; instant?: boolean; x: number; y: number; size: number; anchor: "start" | "end" }> = ({ id, text, at, instant, x, y, size, anchor }) => {
  const p0 = useProgress(at, Math.min(1.3, 0.5 + text.length * 0.04), ease.settle);
  const p = instant ? 1 : p0;
  if (p <= 0) return null;
  const W = 560;
  const cx = anchor === "start" ? x - 10 : x + 10 - W * p;
  return (
    <g>
      <defs><clipPath id={id}><rect x={cx} y={y - size * 1.2} width={W * p} height={size * 1.7} /></clipPath></defs>
      <text data-qa-text="" x={x} y={y} textAnchor={anchor} fontFamily={fonts.text} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
};

/** Text that comes into focus in place (no travel): the hidden things surfacing. */
const FocusText: React.FC<{ text: string; at: number; instant?: boolean; x: number; y: number; size: number }> = ({ text, at, instant, x, y, size }) => {
  const p0 = useProgress(at, 1.2, ease.settle);
  const p = instant ? 1 : p0;
  if (p <= 0) return null;
  return (
    <text data-qa-text="" x={x} y={y} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} opacity={p}
      style={{ filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : undefined }}>{text}</text>
  );
};

/** Zone label; with `from`, the earlier wording (e.g. "in public") holds from the scene start and turns into `text`
 *  on `at` (old word softens out in place while the new one inks in) — the label never goes missing. */
const ZoneLabel: React.FC<{ id: string; label: { text: string; at: number; from?: string }; openAt: number; instant: (at: number) => boolean; x: number; y: number }> = ({ id, label, openAt, instant, x, y }) => {
  const out = useProgress(label.at, 0.6, ease.settle);
  if (!label.from) return <ScriptLabel id={id} text={label.text} at={label.at} instant={instant(label.at)} x={x} y={y} />;
  return (
    <>
      {out < 1 && (
        <g opacity={1 - out} style={{ filter: out > 0 ? `blur(${(out * 5).toFixed(2)}px)` : undefined }}>
          <ScriptLabel id={`${id}-from`} text={label.from} at={openAt} instant={instant(openAt)} x={x} y={y} />
        </g>
      )}
      <ScriptLabel id={id} text={label.text} at={label.at + 0.2} x={x} y={y} />
    </>
  );
};

const ScriptLabel: React.FC<{ id: string; text: string; at: number; instant?: boolean; x: number; y: number }> = ({ id, text, at, instant, x, y }) => {
  const p0 = useProgress(at, Math.min(1.5, 0.6 + text.length * 0.07), ease.settle);
  const p = instant ? 1 : p0;
  if (p <= 0) return null;
  const size = Math.max(56, fit(text, 76, 520, 0.48));
  return (
    <g>
      <defs><clipPath id={id}><rect x={x - 20} y={y - size * 1.1} width={640 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={x} y={y} textAnchor="start" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`} {...scriptGap(size)}>{text}</text>
    </g>
  );
};
