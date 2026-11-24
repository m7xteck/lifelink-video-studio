import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Lesson map" — a winding paper road across the frame with up to 8 stations (paper discs + short titles).
 *   • Roadmap build (no `current`): on each topic's cue the road extends to its station, the disc is set down and its
 *     title comes into focus. The topic being named is oxblood; earlier ones settle to royal / muted.
 *   • Revisit (`current` = i): stations before i are already laid; the road reaches station i on its cue and the disc
 *     pulses once ("you are here"); later stations are absent.
 * Positions depend only on the station count, so a station sits in the same place every time the map returns.
 */
const X0 = 250, X1 = 1670, Y_HI = 500, Y_LO = 740, START = { x: 104, y: 640 };
const R = 36, ROAD_W = 40, ROAD_DUR = 0.9, DISC_DELAY = 0.45, LABEL_DELAY = 0.6;

type Pt = { x: number; y: number };
const stationPts = (n: number): Pt[] => Array.from({ length: n }, (_, i) => ({ x: X0 + ((X1 - X0) * i) / Math.max(1, n - 1), y: i % 2 === 0 ? Y_LO : Y_HI }));

/** Catmull-Rom centre-line through start + stations; returns samples with cumulative length and each station's length. */
const buildRoad = (n: number) => {
  const st = stationPts(n);
  const k = [START, ...st];
  const last = k[k.length - 1], prev = k[k.length - 2];
  const ext = [{ x: 2 * k[0].x - k[1].x, y: 2 * k[0].y - k[1].y }, ...k, { x: 2 * last.x - prev.x, y: 2 * last.y - prev.y }];
  const pts: (Pt & { l: number })[] = [{ ...START, l: 0 }];
  const stationLen: number[] = [];
  for (let s = 1; s < ext.length - 2; s++) {
    const [p0, p1, p2, p3] = [ext[s - 1], ext[s], ext[s + 1], ext[s + 2]];
    for (let j = 1; j <= 40; j++) {
      const t = j / 40, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const q = { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
      const lp = pts[pts.length - 1];
      pts.push({ ...q, l: lp.l + Math.hypot(q.x - lp.x, q.y - lp.y) });
    }
    stationLen.push(pts[pts.length - 1].l);
  }
  return { st, pts, stationLen };
};

const roadUpTo = (pts: (Pt & { l: number })[], len: number) => {
  if (len <= 0.5) return "";
  const out: string[] = [`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.l <= len) { out.push(`L${b.x.toFixed(1)},${b.y.toFixed(1)}`); continue; }
    const u = (len - a.l) / Math.max(1e-6, b.l - a.l);
    out.push(`L${(a.x + (b.x - a.x) * u).toFixed(1)},${(a.y + (b.y - a.y) * u).toFixed(1)}`);
    break;
  }
  return out.join(" ");
};

/** One line when short; otherwise the most balanced two-line split at a word boundary. */
const wrap = (text: string, max = 20): string[] => {
  const w = text.trim().split(/\s+/);
  if (text.length <= max || w.length < 2) return [text];
  let best = [text], score = Infinity;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(" "), b = w.slice(i).join(" ");
    const sc = Math.max(a.length, b.length);
    if (sc < score) { score = sc; best = [a, b]; }
  }
  return best;
};

const clamp01 = (t: number, a: number, dur: number) => interpolate(t, [a, a + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });

export const LessonMap: React.FC<{ scene: SceneOf<"lessonMap"> }> = ({ scene }) => {
  const { stations, current, title } = scene.props;
  const L = useLayout();
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  const t = useNarrationTime();
  const id = `lm-${scene.id}`;
  const n = stations.length;
  const { st, pts, stationLen } = buildRoad(n);
  const revisit = current !== undefined;
  const shown = revisit ? Math.min(current!, n - 1) + 1 : n;
  // effective cue per shown station: past stations on a revisit are simply there
  const cue = stations.slice(0, shown).map((s, i) => (revisit && i < shown - 1 ? -1e6 : s.at));

  let len = 0;
  for (let i = 0; i < shown; i++) {
    const from = i === 0 ? 0 : stationLen[i - 1];
    if (t >= cue[i]) len = Math.max(len, from + (stationLen[i] - from) * clamp01(t, cue[i], ROAD_DUR));
  }
  const road = roadUpTo(pts, len);

  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        {road && (
          <g>
            <path d={road} stroke={D.paperShade} strokeWidth={ROAD_W} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-shadow-1)`} />
            <path d={road} stroke={D.hairline} strokeWidth={3} fill="none" strokeDasharray="14 18" strokeLinecap="round" />
          </g>
        )}
        {stations.slice(0, shown).map((s, i) => (
          <Station key={i} id={id} pt={st[i]} high={i % 2 === 1} title={s.title} at={cue[i]} t={t}
            maxW={Math.min(380, (2 * (X1 - X0)) / Math.max(1, n - 1) - 50)} nextAt={i + 1 < shown ? cue[i + 1] : undefined} pulse={revisit && i === shown - 1} />
        ))}
        {title && <Title text={title.text} at={title.at} t={t} />}
      </svg>
    </AbsoluteFill>
  );
};

const Station: React.FC<{ id: string; pt: Pt; high: boolean; title: string; at: number; t: number; nextAt?: number; pulse: boolean; maxW: number }> = ({ id, pt, high, title, at, t, nextAt, pulse, maxW }) => {
  const land = clamp01(t, at + DISC_DELAY, 0.8);
  if (land <= 0) return null;
  // "now" colour hands over to the next station when it is named
  const handOver = nextAt === undefined ? 0 : clamp01(t, nextAt, 0.7);
  const q = pulse ? clamp01(t, at + DISC_DELAY + 0.7, 0.9) : 0;
  const s = (0.55 + 0.45 * land) * (1 + 0.16 * Math.sin(Math.PI * q));
  const label = clamp01(t, at + LABEL_DELAY, 1.1);
  const lines = wrap(title);
  const size = Math.min(36, Math.floor(maxW / Math.max(...lines.map((l) => l.length * 0.55))));
  const lh = size * 1.2;
  const firstY = high ? pt.y - R - 26 - (lines.length - 1) * lh : pt.y + R + 26 + size * 0.8;
  return (
    <g>
      <g transform={`translate(${pt.x} ${pt.y + (1 - land) * -22}) scale(${s.toFixed(4)})`} opacity={Math.min(1, land * 4)}>
        <circle r={R} fill={P.royal} filter={`url(#${id}-shadow-2)`} />
        <circle r={R} fill={P.oxblood} opacity={1 - handOver} />
        <circle r={9} fill={P.paper} />
      </g>
      {label > 0 && (
        <text data-qa-text="" x={pt.x} y={firstY} textAnchor="middle" fontFamily={fonts.text} fontSize={size}
          opacity={label * (1 - 0.42 * handOver)} style={{ filter: label < 1 ? `blur(${((1 - label) * 6).toFixed(2)}px)` : undefined }}>
          {lines.map((l, i) => (
            <tspan key={i} x={pt.x} dy={i ? lh : 0} fill={P.oxblood}>{l}</tspan>
          ))}
        </text>
      )}
    </g>
  );
};

const Title: React.FC<{ text: string; at: number; t: number }> = ({ text, at, t }) => {
  const p = clamp01(t, at, 1.2);
  if (p <= 0) return null;
  return (
    <text data-qa-text="" x={150} y={170} fontFamily={fonts.text} fontSize={58} fill={P.oxblood} opacity={p}
      style={{ filter: p < 1 ? `blur(${((1 - p) * 7).toFixed(2)}px)` : undefined }}>{text}</text>
  );
};
