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
 * Signature: "Pressures & shelter" — a marriage in a changing world (paper landscape, v3).
 *   • a still paper landscape (pale sky, one far ridge, ground sheet); on `houseAt` a modest layered-paper house
 *     settles onto its low plinth
 *   • each pressure is a long paper ribbon (a drift of weather) that slides in from the frame edge (≤ 140 px) and comes to
 *     rest pressing toward the house, its name printed on it — alternating left / right, three slots a side (top→bottom)
 *   • values: the ground opens beneath the house (a cut-away trench) on the first value and each value is set in it as a
 *     foundation stone on its cue; on `foundationAt` the stones take the royal ink and the ribbons ease back (≤ 40 px)
 *   • `focus` (pressure index) dims the other ribbons for revisits; settled frames are still.
 * Fixed 1920×1080 artboard. The house walls stand exactly on the plinth, the plinth exactly on the ground line.
 */
const GROUND = 730;
// house in a 3/4 view: a front gable face + a receding side wall under one roof plane (centred on x 960)
const FRONT = { l: 772, r: 990, top: 548 };
const APEX = { x: 881, y: 420 };
const SIDE_R = 1150;
const ROOF_DX = 160; // depth of the roof plane (front gable edge → back ridge)
const EAVE = 14;     // gable overhang
const HOUSE_SCALE = 1.3; // the house is drawn at 1.0 around x 960 and scaled up from its base
const PLINTH = { l: 676, r: 1246, top: GROUND - 20 };
// ribbons: three slots a side; tips stop short of the house
const ROWS = [404, 516, 628];
const RIB_H = 62;
// per-row tips follow the house outline (gable / roof slope above the eaves, walls below) with a ~24 px gap
const TIP_L = [772, 692, 692], TIP_R = [1142, 1232, 1232];
const TRENCH = { top: GROUND + 16, h: 112 };

/** Script face has a near-zero space: set words as tspans with an explicit gap. */
const scriptWords = (text: string, size: number) => text.split(" ").map((w, i) => <tspan key={i} dx={i ? size * 0.3 : 0}>{w}</tspan>);
const fit = (text: string, max: number, maxW: number, em = 0.56) => Math.min(max, Math.floor(maxW / Math.max(1, text.length * em)));

const ridge = (base: number, amp: number, freq: number, phase: number) => {
  const xs = Array.from({ length: 49 }, (_, i) => i * 40);
  return `M0,1080 L${xs.map((x) => `${x},${(base + amp * Math.sin(x / freq + phase)).toFixed(1)}`).join(" L")} L1920,1080 Z`;
};
// ground: level under the house, the faintest roll toward the edges
const GROUND_D = `M0,${GROUND + 10} C420,${GROUND - 4} 640,${GROUND} 960,${GROUND} C1280,${GROUND} 1500,${GROUND - 6} 1920,${GROUND + 8} L1920,1080 L0,1080 Z`;

export const PressuresShelter: React.FC<{ scene: SceneOf<"pressuresShelter"> }> = ({ scene }) => {
  const { houseAt, pressures, values = [], foundationAt, caption, focus } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `ps-${scene.id}`;
  const house = useProgress(houseAt, 1.5, ease.settle);
  const plinth = useProgress(houseAt - 0.3, 1.2, ease.settle);
  const found = useProgress(foundationAt ?? 1e9, 1.6, ease.settle);
  const n = Math.min(6, pressures.length);
  const w = focusWeights(n, focus, t);
  const labelSize = Math.min(36, ...pressures.slice(0, n).map((p) => fit(p.text, 36, 430)));

  // foundation stones (≤ 4), centred under the house
  const vals = values.slice(0, 4);
  const GAP = 14;
  const stoneW = vals.length ? Math.min(250, Math.floor((1000 - GAP * (vals.length - 1)) / vals.length)) : 0;
  const rowW = vals.length * stoneW + Math.max(0, vals.length - 1) * GAP;
  const x0 = 960 - rowW / 2;
  const valSize = Math.min(30, ...vals.map((v) => fit(v.text, 30, stoneW - 40, 0.55)));
  const open = useProgress(vals.length ? vals[0].at - 0.45 : 1e9, 0.9, ease.settle);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.skyTint} stopOpacity="0.9" />
            <stop offset="70%" stopColor={D.skyTint} stopOpacity="0.25" />
            <stop offset="100%" stopColor={D.paperLight} stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={`${id}-trench`}>
            <rect x={x0 - 22} y={TRENCH.top} width={rowW + 44} height={TRENCH.h * open} />
          </clipPath>
        </defs>

        {/* still landscape: sky wash, one far ridge, the ground sheet */}
        <rect x={0} y={0} width={1920} height={GROUND + 20} fill={`url(#${id}-sky)`} />
        <path d={ridge(GROUND - 34, 14, 260, 1.2)} fill={D.skyTint} filter={`url(#${id}-shadow-1)`} />
        <path d={GROUND_D} fill={D.paperShade} filter={`url(#${id}-shadow-2)`} />
        <path d={ridge(1000, 8, 330, 3.1)} fill={D.hairline} opacity={0.55} />

        {/* pressures: paper ribbons (ease back once the foundation is named) */}
        {pressures.slice(0, n).map((p, i) => (
          <Ribbon key={i} id={id} text={p.text} at={p.at} i={i} size={labelSize} weight={w[i] * (1 - found * 0.4)} back={found} />
        ))}

        {/* the foundation trench opens beneath the house; values are set in it as stones */}
        {vals.length > 0 && open > 0 && (
          <g clipPath={`url(#${id}-trench)`}>
            <rect x={x0 - 22} y={TRENCH.top} width={rowW + 44} height={TRENCH.h} rx={4} fill={D.hairline} />
            <rect x={x0 - 22} y={TRENCH.top} width={rowW + 44} height={10} fill={P.oxblood} opacity={0.12} />
            {vals.map((v, i) => (
              <Stone key={i} id={id} text={v.text} at={v.at} x={x0 + i * (stoneW + GAP)} w={stoneW} size={valSize} found={found} />
            ))}
          </g>
        )}

        {/* plinth: two paper courses on the ground line */}
        <g opacity={Math.min(1, plinth * 5)} transform={`translate(0 ${((1 - plinth) * 16).toFixed(2)})`}>
          <rect x={PLINTH.l} y={PLINTH.top} width={PLINTH.r - PLINTH.l} height={GROUND - PLINTH.top + 6} rx={2} fill={D.paperLight} filter={`url(#${id}-shadow-1)`} />
          <rect x={PLINTH.l + 10} y={PLINTH.top + 12} width={PLINTH.r - PLINTH.l - 20} height={GROUND - PLINTH.top - 6} fill={D.hairline} opacity={0.55} />
        </g>

        {/* house: settles onto the plinth */}
        {house > 0 && <g transform={`translate(960 ${PLINTH.top}) scale(${HOUSE_SCALE}) translate(-960 ${-PLINTH.top})`}><House id={id} p={house} /></g>}

        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} y={vals.length ? 1012 : 960} />}
      </svg>
    </AbsoluteFill>
  );
};

const House: React.FC<{ id: string; p: number }> = ({ id, p }) => {
  const base = PLINTH.top;
  const roofFront = `M${APEX.x},${APEX.y} L${FRONT.r + EAVE},${FRONT.top + 12} L${FRONT.r + EAVE + ROOF_DX * 0.9},${FRONT.top + 12} L${APEX.x + ROOF_DX},${APEX.y} Z`;
  const gable = `M${FRONT.l},${base} L${FRONT.l},${FRONT.top} L${APEX.x},${APEX.y + 14} L${FRONT.r},${FRONT.top} L${FRONT.r},${base} Z`;
  // fascia: a folded paper strip along the gable edge
  const fascia = `M${FRONT.l - EAVE},${FRONT.top + 12} L${APEX.x},${APEX.y - 4} L${FRONT.r + EAVE},${FRONT.top + 12} L${FRONT.r + EAVE - 5},${FRONT.top + 19} L${APEX.x},${APEX.y + 5} L${FRONT.l - EAVE + 5},${FRONT.top + 19} Z`;
  const doorX = FRONT.l + (FRONT.r - FRONT.l) * 0.5 - 30;
  return (
    <g opacity={Math.min(1, p * 5)} transform={`translate(0 ${((1 - p) * 36).toFixed(2)})`}>
      {/* side wall (receding, in shade) */}
      <rect x={FRONT.r} y={FRONT.top + 6} width={SIDE_R - FRONT.r} height={base - FRONT.top - 6} fill={D.paperShade} filter={`url(#${id}-shadow-2)`} />
      <rect x={FRONT.r + 52} y={FRONT.top + 70} width={56} height={64} rx={2} fill={P.sky} />
      <rect x={FRONT.r + 52} y={FRONT.top + 70} width={56} height={8} fill={D.royalDeep} opacity={0.18} />
      {/* roof plane */}
      <path d={roofFront} fill={P.rose} filter={`url(#${id}-shadow-2)`} />
      <path d={`M${APEX.x + ROOF_DX},${APEX.y} L${FRONT.r + EAVE + ROOF_DX * 0.9},${FRONT.top + 12} L${FRONT.r + EAVE + ROOF_DX * 0.9 - 22},${FRONT.top + 12} L${APEX.x + ROOF_DX - 8},${APEX.y + 8} Z`} fill={P.oxblood} opacity={0.2} />
      {/* front gable face */}
      <path d={gable} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
      <path d={fascia} fill={D.oxbloodMuted} filter={`url(#${id}-shadow-1)`} />
      {/* door: a cut-out with its own shadow edge */}
      <path d={`M${doorX},${base} L${doorX},${base - 92} Q${doorX + 30},${base - 122} ${doorX + 60},${base - 92} L${doorX + 60},${base} Z`} fill={P.royal} />
      <path d={`M${doorX},${base - 92} Q${doorX + 30},${base - 122} ${doorX + 60},${base - 92} L${doorX + 60},${base - 84} Q${doorX + 30},${base - 114} ${doorX},${base - 84} Z`} fill={D.royalDeep} opacity={0.55} />
    </g>
  );
};

/** One pressure: a long paper ribbon from the frame edge to just short of the house, its name printed on it. */
const Ribbon: React.FC<{ id: string; text: string; at: number; i: number; size: number; weight: number; back: number }> = ({ id, text, at, i, size, weight, back }) => {
  const p = useProgress(at, 1.5, ease.settle);
  if (p <= 0) return null;
  const left = i % 2 === 0;
  const y = ROWS[Math.floor(i / 2) % 3];
  const dir = left ? 1 : -1;
  const row = Math.floor(i / 2) % 3;
  const tip = left ? TIP_L[row] : TIP_R[row];
  const edge = left ? -60 : 1980;
  const h = RIB_H / 2;
  const amp = [5, -6, 4][Math.floor(i / 2) % 3];
  const a = edge + dir * (Math.abs(tip - edge) * 0.33), b = edge + dir * (Math.abs(tip - edge) * 0.66);
  const neck = tip - dir * 120;
  // a gently waving band that narrows into a folded point at the house
  // the band narrows softly to a rounded end (a drift of paper, not an arrow head)
  const r = h * 0.42;
  const d = `M${edge},${y - h} C${a},${y - h - amp} ${b},${y - h + amp} ${neck},${y - h + 2} C${neck + dir * 70},${y - h + 4} ${tip - dir * r},${y - r} ${tip - dir * r * 0.4},${y - r * 0.55} Q${tip},${y} ${tip - dir * r * 0.4},${y + r * 0.55} C${tip - dir * r},${y + r} ${neck + dir * 70},${y + h - 2} ${neck},${y + h - 2} C${b},${y + h + amp} ${a},${y + h - amp} ${edge},${y + h} Z`;
  // a twist in the ribbon: its reverse side shows as a darker slanted band
  const fold = `M${neck - dir * 16},${y - h + 2} L${neck + dir * 4},${y - h + 2} L${neck + dir * 26},${y + h - 2} L${neck + dir * 6},${y + h - 2} Z`;
  const dx = -dir * ((1 - p) * 140 + back * 40);
  const textX = left ? 96 : 1824;
  return (
    <g opacity={Math.min(1, p * 4) * weight} transform={`translate(${dx.toFixed(2)} 0)`}>
      <path d={d} fill={P.sky} filter={`url(#${id}-shadow-1)`} />
      <path d={fold} fill={D.hillFar} />
      <path d={`M${edge},${y - h + 7} C${a},${y - h - amp + 7} ${b},${y - h + amp + 7} ${neck},${y - h + 10}`} stroke={D.paperLight} strokeWidth={1.5} fill="none" opacity={0.5} />
      <text data-qa-text="" x={textX} y={y + size * 0.36} textAnchor={left ? "start" : "end"} fontFamily={fonts.text} fontSize={size} fill={P.oxblood}>{text}</text>
    </g>
  );
};

/** A value set as a foundation stone: lifts into the trench on its cue; takes the royal ink on `foundationAt`. */
const Stone: React.FC<{ id: string; text: string; at: number; x: number; w: number; size: number; found: number }> = ({ id, text, at, x, w, size, found }) => {
  const p = useProgress(at - 0.1, 1.0, ease.settle);
  if (p <= 0) return null;
  const top = TRENCH.top + 16, h = TRENCH.h - 30;
  const cx = x + w / 2, ty = top + h / 2 + size * 0.36;
  const lift = found * 6;
  return (
    <g opacity={Math.min(1, p * 5)} transform={`translate(0 ${((1 - p) * 44 - lift).toFixed(2)})`}>
      <rect x={x} y={top} width={w} height={h} rx={3} fill={D.paperLight} filter={`url(#${id}-shadow-${found > 0.5 ? 2 : 1})`} />
      <rect x={x} y={top} width={w} height={h} rx={3} fill={P.royal} opacity={found} />
      <text data-qa-text="" x={cx} y={ty} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood} opacity={1 - found}>{text}</text>
      {found > 0 && <text x={cx} y={ty} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.paperLight} opacity={found}>{text}</text>}
    </g>
  );
};

const CaptionScript: React.FC<{ id: string; text: string; at: number; y: number }> = ({ id, text, at, y }) => {
  const p = useProgress(at, Math.min(1.6, 0.6 + text.length * 0.07), ease.settle);
  if (p <= 0) return null;
  const size = fit(text, 72, 900, 0.48);
  return (
    <g>
      <defs><clipPath id={id}><rect x={960 - 540} y={y - size * 1.1} width={1080 * p} height={size * 1.6} /></clipPath></defs>
      <text data-qa-text="" x={960} y={y} textAnchor="middle" fontFamily={fonts.script} fontSize={size} fill={P.oxblood} clipPath={`url(#${id})`}>{scriptWords(text, size)}</text>
    </g>
  );
};

