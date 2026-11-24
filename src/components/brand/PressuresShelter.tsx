import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useProgress, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { focusWeights } from "../../motion/focus";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
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
// house (v005): paper-cut layered planes, front-on — a main gabled block and a lower wing behind it, each a separate
// sheet with its own soft shadow, roofs as folded strips in quiet oxblood-muted tones, door and windows as cut recesses
const MAIN = { l: 742, r: 1050, eave: 500, apex: { x: 896, y: 346 } };
const WING = { l: 1010, r: 1196, eave: 578, apex: { x: 1108, y: 478 } };
const ROOF_T = 40;   // thickness of the folded roof strip
const OVER = 22;     // eave overhang
const PLINTH = { l: 676, r: 1246, top: GROUND - 20 };
// ribbons: three slots a side; tips stop short of the house
const ROWS = [404, 516, 628];
const RIB_H = 72;
const SAFE_L = 96, SAFE_R = 1824; // ribbons and labels stay inside the 5 % safe area at every frame
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
  const labelSize = Math.min(44, ...pressures.slice(0, n).map((p, i) => fit(p.text, 44, Math.abs((i % 2 === 0 ? TIP_L : TIP_R)[Math.floor(i / 2) % 3] - (i % 2 === 0 ? SAFE_L + 40 : SAFE_R - 40)) - 170, 0.55)));

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
        <PaperTextureDefs id={id} strength={0.26} />
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
        {house > 0 && <House id={id} p={house} />}

        {caption && <CaptionScript id={`${id}-cap`} text={caption.text} at={caption.at} y={vals.length ? 1012 : 960} />}
      </svg>
      <TextureGate />
    </AbsoluteFill>
  );
};

const roofStrip = (l: number, r: number, eave: number, apex: { x: number; y: number }, side: -1 | 1) => {
  // one slope of a folded paper roof: from the ridge out past the wall by OVER, ROOF_T thick
  const ex = side < 0 ? l - OVER : r + OVER;
  const k = (eave - apex.y) / Math.abs(apex.x - (side < 0 ? l : r));
  const ey = eave + OVER * k;
  return `M${apex.x},${apex.y - ROOF_T * 0.6} L${ex},${ey - ROOF_T} L${ex},${ey} L${apex.x},${apex.y + ROOF_T * 0.4} Z`;
};
const gableWall = (l: number, r: number, eave: number, apex: { x: number; y: number }, base: number) =>
  `M${l},${base} L${l},${eave} L${apex.x},${apex.y + 8} L${r},${eave} L${r},${base} Z`;
const mixHex = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join("");
};
const ROOF_LIT = mixHex(D.oxbloodMuted, D.paperShade, 0.18);  // quiet roof tones, shifted toward oxbloodMuted
const ROOF_SHADE = mixHex(D.oxbloodMuted, P.oxblood, 0.22);
const WING_ROOF = mixHex(D.oxbloodMuted, D.paperShade, 0.42);
const DOOR = mixHex(D.royalDeep, D.paperShade, 0.18);           // a quiet royalDeep door

/** The house is built from separate cut-paper sheets that settle in order, back to front (a few px of rise each). */
const House: React.FC<{ id: string; p: number }> = ({ id, p }) => {
  const base = PLINTH.top;
  const sheet = (k: number) => {
    const q = Math.max(0, Math.min(1, p * 1.5 - k * 0.12));
    return { opacity: Math.min(1, q * 5), transform: `translate(0 ${((1 - ease.settle(q)) * 26).toFixed(2)})` };
  };
  const doorX = 800, doorW = 64, doorH = 118;
  const win = { x: 940, y: 560, w: 72, h: 74 };
  return (
    <g>
      {/* 1 · the lower wing, behind */}
      <g {...sheet(0)}>
        <path d={gableWall(WING.l, WING.r, WING.eave, WING.apex, base)} fill={D.paperShade} filter={`url(#${id}-shadow-1)`} />
        <g filter={`url(#${id}-tex)`}>
          <path d={roofStrip(WING.l, WING.r, WING.eave, WING.apex, -1)} fill={WING_ROOF} />
          <path d={roofStrip(WING.l, WING.r, WING.eave, WING.apex, 1)} fill={mixHex(WING_ROOF, ROOF_SHADE, 0.35)} />
        </g>
        <rect x={1098} y={604} width={52} height={50} rx={2} fill={D.skyTint} />
        <rect x={1098} y={604} width={52} height={7} fill={D.royalDeep} opacity={0.16} />
        <rect x={1094} y={654} width={60} height={4} rx={1} fill={D.hairline} />
      </g>
      {/* 2 · the main block: a shade sheet just behind the wall gives it thickness */}
      <g {...sheet(1)}>
        <path d={gableWall(MAIN.l + 10, MAIN.r + 10, MAIN.eave + 6, { x: MAIN.apex.x + 10, y: MAIN.apex.y + 6 }, base)} fill={D.hairline} />
        <g filter={`url(#${id}-tex)`}>
          <path d={gableWall(MAIN.l, MAIN.r, MAIN.eave, MAIN.apex, base)} fill={D.paperLight} filter={`url(#${id}-shadow-2)`} />
        </g>
        {/* door: a cut recess, its upper edge in shadow */}
        <rect x={doorX - 6} y={base - doorH - 6} width={doorW + 12} height={doorH + 6} rx={3} fill={D.paperShade} />
        <rect x={doorX} y={base - doorH} width={doorW} height={doorH} rx={2} fill={DOOR} />
        <rect x={doorX} y={base - doorH} width={doorW} height={12} fill="#1a0a0a" opacity={0.18} />
        <circle cx={doorX + doorW - 14} cy={base - doorH / 2 + 6} r={3} fill={P.sky} opacity={0.7} />
        {/* window: a cut opening onto the sky, a fine paper mullion and a sill */}
        <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={2} fill={D.skyTint} />
        <rect x={win.x} y={win.y} width={win.w} height={9} fill={D.royalDeep} opacity={0.16} />
        <rect x={win.x + win.w / 2 - 1.5} y={win.y} width={3} height={win.h} fill={D.paperLight} />
        <rect x={win.x - 6} y={win.y + win.h} width={win.w + 12} height={5} rx={1} fill={D.hairline} />
      </g>
      {/* 3 · the roof: two folded strips meeting at the ridge, the far slope in shade */}
      <g {...sheet(2)}>
        <g filter={`url(#${id}-shadow-2)`}>
          <path d={roofStrip(MAIN.l, MAIN.r, MAIN.eave, MAIN.apex, 1)} fill={ROOF_SHADE} />
          <path d={roofStrip(MAIN.l, MAIN.r, MAIN.eave, MAIN.apex, -1)} fill={ROOF_LIT} />
        </g>
        <path d={`M${MAIN.apex.x},${MAIN.apex.y - ROOF_T * 0.6 + 2} L${MAIN.l - OVER + 3},${MAIN.eave + OVER * ((MAIN.eave - MAIN.apex.y) / (MAIN.apex.x - MAIN.l)) - ROOF_T + 2}`}
          stroke={D.paperLight} strokeWidth={1.5} opacity={0.45} fill="none" />
      </g>
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
  const edge = left ? SAFE_L + 40 : SAFE_R - 40; // rests 40 px in, so easing back on `foundationAt` still ends inside the safe area
  const h = RIB_H / 2;
  const amp = [5, -6, 4][Math.floor(i / 2) % 3];
  const a = edge + dir * (Math.abs(tip - edge) * 0.33), b = edge + dir * (Math.abs(tip - edge) * 0.66);
  const neck = tip - dir * 120;
  // a gently waving band that narrows into a folded point at the house
  // the band narrows softly to a rounded end (a drift of paper, not an arrow head)
  const r = h * 0.42;
  const d = `M${edge},${y - h} C${a},${y - h - amp} ${b},${y - h + amp} ${neck},${y - h + 2} C${neck + dir * 70},${y - h + 4} ${tip - dir * r},${y - r} ${tip - dir * r * 0.4},${y - r * 0.55} Q${tip},${y} ${tip - dir * r * 0.4},${y + r * 0.55} C${tip - dir * r},${y + r} ${neck + dir * 70},${y + h - 2} ${neck},${y + h - 2} C${b},${y + h + amp} ${a},${y + h - amp} ${edge},${y + h} L${edge + dir * 24},${y} Z`;
  // a twist in the ribbon: its reverse side shows as a darker slanted band
  const fold = `M${neck - dir * 16},${y - h + 2} L${neck + dir * 4},${y - h + 2} L${neck + dir * 26},${y + h - 2} L${neck + dir * 6},${y + h - 2} Z`;
  // the ribbon unrolls from its outer end toward the house (never from outside the frame); it eases back from
  // the house (≤ 40 px, still inside the safe area) once the foundation is named
  const dx = -dir * back * 40;
  const textX = left ? edge + 40 : edge - 40;
  const reach = edge + dir * (Math.abs(tip - edge) + 10) * p;
  const clipX = left ? edge - 4 : reach, clipW = Math.abs(reach - edge) + 4;
  return (
    <g opacity={Math.min(1, p * 4) * weight} transform={`translate(${dx.toFixed(2)} 0)`}>
      <defs><clipPath id={`${id}-rib${i}`}><rect x={clipX} y={y - h - 14} width={clipW} height={RIB_H + 28} /></clipPath></defs>
      {/* the band stretches out from its tail (its rounded end always leads; no hard wipe edge); the name is uncovered behind it */}
      <g transform={`translate(${edge} 0) scale(${(0.2 + 0.8 * p).toFixed(4)} 1) translate(${-edge} 0)`}>
        <path d={d} fill={P.sky} filter={`url(#${id}-shadow-1)`} />
        <path d={fold} fill={D.hillFar} />
        <path d={`M${edge},${y - h + 7} C${a},${y - h - amp + 7} ${b},${y - h + amp + 7} ${neck},${y - h + 10}`} stroke={D.paperLight} strokeWidth={1.5} fill="none" opacity={0.5} />
      </g>
      <g clipPath={`url(#${id}-rib${i})`}>
      <text data-qa-text="" x={textX} y={y + size * 0.36} textAnchor={left ? "start" : "end"} fontFamily={fonts.text} fontSize={size} fill={P.oxblood}>{text}</text>
      </g>
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

