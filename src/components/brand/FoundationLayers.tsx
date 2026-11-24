import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { Ink, PaperDefs } from "../../illustrations/paper";
import { DIM, focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";
import { PaperTextureDefs, TextureGate } from "./paperTexture";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Foundation layers" — a wall of cut-paper bricks laid bottom-up.
 *   • each course (area) is named on its cue: its label sets at the left of the wall
 *   • each brick (quality) is laid into its course on its cue, labelled inside
 *   • `focus` (course index) dims the other courses for revisits; settled frames are still.
 * Courses sit exactly on the one below by construction (fixed course height, shared wall edges).
 * Masonry construction: on a course's name a fine mortar line is drawn along its bed, then each dressed stone
 * (bevelled top edge, shaded foot, paper grain) is lowered onto it. Tone runs heavy → light up the wall
 * (oxblood foundation, royal, sky), so the foundation reads as the weight-bearing course.
 */
// v005: the wall fills the frame (≈1.6× the v004 course height); labels at the left inside the 5 % safe margin
const WALL_L = 560, WALL_R = 1764, GAP = 14, STEP = 40; // each course steps in: a broad foundation, joints never align
const LABEL_L = 110;                                     // left edge available to the course labels
const DIMMED_TO = 0.78;                                  // a dimmed course is desaturated this far toward backgroundDeep
const TONES = [
  { fill: P.oxblood, ink: D.paperLight },
  { fill: P.royal, ink: D.paperLight },
  { fill: P.sky, ink: P.oxblood },
  { fill: D.hillMid, ink: D.paperLight },
];
const linear = (x: number) => x;
const BG_DEEP = brand.colors.backgroundDeep as string;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** hex × hex → hex (so mixes can be chained) */
const mix = (a: string, b: string, k: number) => { const pa = rgb(a), pb = rgb(b); return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
/** focus weight (1 … DIM) → desaturation amount (0 … DIMMED_TO): dimmed courses recede as paper, never as see-through ink */
const dimOf = (w: number) => Math.max(0, Math.min(1, (1 - w) / (1 - DIM))) * DIMMED_TO;

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const FoundationLayers: React.FC<{ scene: SceneOf<"foundationLayers"> }> = ({ scene }) => {
  const { courses, groundAt, focus, ghostAt } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `fl-${scene.id}`;
  const n = courses.length;
  const CH = Math.min(228, Math.floor(780 / n));
  const bottom = Math.round(530 + (n * CH) / 2); // wall vertically centred on the artboard
  const ground = useProgress(groundAt ?? scene.startSec, 1.2, ease.settle);
  const groundO = useProgress(groundAt ?? scene.startSec, 0.2, linear);
  const w = focusWeights(n, focus, t);
  const frameDy = 540 - bottom + (n * CH) / 2;
  const g0 = groundAt ?? scene.startSec;
  // one label size for the whole wall (consistent type), fitted to the tightest brick
  const brickW = (ci: number) => (WALL_R - WALL_L - 2 * ci * STEP - GAP * (courses[ci].items.length - 1)) / courses[ci].items.length;
  // brick lettering: one size per course (a four-brick course is set a little smaller rather than shrinking the whole wall)
  const labelSize = courses.map((c, ci) => Math.min(52, ...c.items.map((it) => fit(it.text, 52, brickW(ci) - 52, 0.56))));
  const courseSize = Math.min(54, ...courses.map((c, ci) => fit(c.label, 54, WALL_L + ci * STEP - 44 - LABEL_L)));
  const ghost = [0, 1, 2, 3].map((ci) => useProgress((ghostAt ?? 1e9) + ci * 0.3, 1.1, ease.settle));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <PaperTextureDefs id={id} />
        <g transform={`translate(0 ${frameDy.toFixed(2)})`}>
        {/* ground: a light card slab the wall stands on, its edge inked */}
        <g filter={`url(#${id}-tex)`} opacity={groundO} transform={`translate(0 ${((1 - ground) * 14).toFixed(2)})`}>
          <rect x={WALL_L - 48} y={bottom} width={WALL_R - WALL_L + 96} height={14} rx={2} fill={D.paperLight} filter={`url(#${id}-shadow-1)`} />
          <rect x={WALL_L - 56} y={bottom + 14} width={WALL_R - WALL_L + 112} height={12} rx={2} fill={D.hairline} filter={`url(#${id}-shadow-2)`} />
        </g>
        {/* setting-out. With `ghostAt` ("three areas"): three ghost courses — pale paper slabs at their final size —
            are laid on the ground, bottom-up; the dressed bricks are set into them. Without it: fine dashed outlines
            ruled with the ground, which fade once their course is complete (no stray dashes along finished edges) */}
        {courses.map((c, ci) => {
          const yTop = bottom - (ci + 1) * CH + GAP / 2, yBot = bottom - ci * CH - GAP / 2;
          const l = WALL_L + ci * STEP, r = WALL_R - ci * STEP;
          if (ghostAt !== undefined) {
            const g = ghost[ci] ?? 0;
            if (g <= 0) return null;
            return (
              <g key={`gh${ci}`} opacity={Math.min(1, g * 3)} transform={`translate(0 ${((1 - g) * -18).toFixed(2)})`}>
                <rect x={l} y={yTop} width={r - l} height={yBot - yTop} rx={3} fill={BG_DEEP} filter={`url(#${id}-shadow-1)`} />
                <rect x={l + 1} y={yTop + 1} width={r - l - 2} height={yBot - yTop - 2} rx={3} fill="none" stroke={D.hairline} strokeWidth={2} />
              </g>
            );
          }
          return <SettingOut key={`so${ci}`} d={`M${l},${yBot} L${l},${yTop} L${r},${yTop} L${r},${yBot}`} at={g0 + 0.3 + ci * 0.35}
            doneAt={Math.max(...c.items.map((it) => it.at)) + 0.9} weight={w[ci]} />;
        })}
        {courses.map((c, ci) => {
          const yTop = bottom - (ci + 1) * CH;
          const k = c.items.length;
          const l = WALL_L + ci * STEP, r = WALL_R - ci * STEP;
          const bw = (r - l - GAP * (k - 1)) / k;
          const dim = dimOf(w[ci]);
          const base = TONES[ci % TONES.length];
          // dimmed: the stone's colour is desaturated toward backgroundDeep; its lettering turns muted oxblood (still legible)
          const tone = { fill: mix(base.fill, BG_DEEP, dim), ink: mix(base.ink === D.paperLight ? mix(base.ink, D.oxbloodMuted, Math.min(1, dim * 1.4)) : base.ink, D.oxbloodMuted, dim * 0.5) };
          return (
            <g key={ci}>
              <CourseLabel text={c.label} at={c.at} y={yTop + CH / 2} right={l - 44} size={courseSize} color={mix(P.oxblood, D.oxbloodMuted, dim / DIMMED_TO)} />
              {/* leader + mortar bed, drawn as the course is named */}
              <Ink d={`M${l - 32},${yTop + CH / 2} L${l - 10},${yTop + CH / 2}`} color={D.oxbloodMuted} width={2} at={c.at + 0.2} dur={0.6} opacity={0.7 * (1 - dim * 0.6)} />
              <Ink d={`M${l},${yTop + CH - 1} L${r},${yTop + CH - 1}`} color={D.oxbloodMuted} width={2} at={c.at} dur={1.2} opacity={0.55 * (1 - dim * 0.6)} cap="butt" />
              <g filter={`url(#${id}-tex)`}>
                {c.items.map((it, ii) => (
                  <Brick key={ii} id={id} x={l + ii * (bw + GAP)} y={yTop + GAP / 2} w={bw} h={CH - GAP} tone={tone} shade={1 - dim} text={it.text} at={it.at} size={labelSize[ci]} />
                ))}
              </g>
            </g>
          );
        })}
        </g>
      </svg>
      <TextureGate />
    </AbsoluteFill>
  );
};

/** A dressed stone lowered onto its bed: bevelled top edge, shaded foot; its label sets as it lands. */
const Brick: React.FC<{ id: string; x: number; y: number; w: number; h: number; tone: { fill: string; ink: string }; shade: number; text: string; at: number; size: number }> = ({ id, x, y, w, h, tone, shade, text, at, size }) => {
  const p = useProgress(at, 0.9, ease.settle);
  const o = useProgress(at, 0.14, linear); // opaque card at once; only the descent eases
  if (p <= 0) return null;
  return (
    <g opacity={o} transform={`translate(0 ${((1 - p) * -32).toFixed(2)})`}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={tone.fill} filter={`url(#${id}-shadow-2)`} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={3} rx={1.5} fill={D.paperLight} opacity={0.32} />
      <rect x={x} y={y + h - 12} width={w} height={12} rx={3} fill="#1a0a0a" opacity={0.1 * (0.4 + 0.6 * shade)} />
      <text data-qa-text="" x={x + w / 2} y={y + h / 2 + size * 0.35} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={tone.ink} opacity={interpolate01(p)}>{text}</text>
    </g>
  );
};
const interpolate01 = (p: number) => Math.max(0, Math.min(1, (p - 0.3) / 0.7));

const CourseLabel: React.FC<{ text: string; at: number; y: number; right: number; size: number; color: string }> = ({ text, at, y, right, size, color }) => {
  const p = useProgress(at, 1.1, ease.settle);
  if (p <= 0) return null;
  return (
    <text data-qa-text="" x={right - (1 - p) * 14} y={y + size * 0.35} textAnchor="end" fontFamily={fonts.text} fontSize={size} fill={color} opacity={p}>{text}</text>
  );
};

/** Fine dashed outline of a course, ruled with the ground; fades away once its course is complete. */
const SettingOut: React.FC<{ d: string; at: number; doneAt: number; weight: number }> = ({ d, at, doneAt, weight }) => {
  const gone = useProgress(doneAt, 0.8, ease.settle);
  if (gone >= 1) return null;
  return <Ink d={d} color={D.oxbloodMuted} width={1.6} dash="7 9" at={at} dur={1.4} opacity={0.45 * weight * (1 - gone)} />;
};
