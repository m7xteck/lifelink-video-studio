import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Foundation layers" — a wall of cut-paper bricks laid bottom-up.
 *   • each course (area) is named on its cue: its label sets at the left of the wall
 *   • each brick (quality) is laid into its course on its cue, labelled inside
 *   • `focus` (course index) dims the other courses for revisits; settled frames are still.
 * Courses sit exactly on the one below by construction (fixed course height, shared wall edges).
 */
const WALL_L = 600, WALL_R = 1760, CH = 142, GAP = 12, STEP = 34; // each course steps in: a broad foundation, joints never align
const FILLS = [P.oxblood, P.royal, P.rose, D.hillMid];

const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

export const FoundationLayers: React.FC<{ scene: SceneOf<"foundationLayers"> }> = ({ scene }) => {
  const { courses, groundAt, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `fl-${scene.id}`;
  const n = courses.length;
  const bottom = Math.round(560 + (n * CH) / 2); // wall vertically centred on the artboard
  const ground = useProgress(groundAt ?? scene.startSec, 1.2, ease.settle);
  const w = focusWeights(n, focus, t);
  // one label size for the whole wall (consistent type), fitted to the tightest brick
  const brickW = (ci: number) => (WALL_R - WALL_L - 2 * ci * STEP - GAP * (courses[ci].items.length - 1)) / courses[ci].items.length;
  const labelSize = Math.min(...courses.flatMap((c, ci) => c.items.map((it) => fit(it.text, 40, brickW(ci) - 44, 0.5))));

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        {/* ground slab the wall stands on */}
        <rect x={WALL_L - 40} y={bottom} width={WALL_R - WALL_L + 80} height={26} rx={2} fill={D.paperShade} filter={`url(#${id}-shadow-1)`} opacity={Math.min(1, ground * 4)} />
        {courses.map((c, ci) => {
          const yTop = bottom - (ci + 1) * CH;
          const k = c.items.length;
          const l = WALL_L + ci * STEP, r = WALL_R - ci * STEP;
          const bw = (r - l - GAP * (k - 1)) / k;
          return (
            <g key={ci} opacity={w[ci]}>
              <CourseLabel text={c.label} at={c.at} y={yTop + CH / 2} right={l - 36} />
              {c.items.map((it, ii) => (
                <Brick key={ii} id={id} x={l + ii * (bw + GAP)} y={yTop + GAP / 2} w={bw} h={CH - GAP} fill={FILLS[ci % FILLS.length]} text={it.text} at={it.at} size={labelSize} />
              ))}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** A brick laid into place: lowered a short way onto the course below, label sets with it. */
const Brick: React.FC<{ id: string; x: number; y: number; w: number; h: number; fill: string; text: string; at: number; size: number }> = ({ id, x, y, w, h, fill, text, at, size }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  return (
    <g opacity={Math.min(1, p * 4)} transform={`translate(0 ${((1 - p) * -36).toFixed(2)})`}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} filter={`url(#${id}-shadow-2)`} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={2} fill={P.paper} opacity={0.18} />
      <text data-qa-text="" x={x + w / 2} y={y + h / 2 + size * 0.35} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.paper} opacity={interpolate01(p)}>{text}</text>
    </g>
  );
};
const interpolate01 = (p: number) => Math.max(0, Math.min(1, (p - 0.3) / 0.7));

const CourseLabel: React.FC<{ text: string; at: number; y: number; right: number }> = ({ text, at, y, right }) => {
  const p = useProgress(at, 1.1, ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 44, right - 110);
  return (
    <text data-qa-text="" x={right - (1 - p) * 14} y={y + size * 0.35} textAnchor="end" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} opacity={p}>{text}</text>
  );
};
