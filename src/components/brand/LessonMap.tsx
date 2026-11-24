import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import type { SceneOf } from "../../schema/manifest";

const P = brand.palette, D = brand.derived as Record<string, string>;

/*
 * Signature: "Lesson map" — a winding cut-paper road across the whole frame with up to 8 stations (paper discs + short titles).
 *   • The whole route is always laid out: stations not yet reached are quiet blank paper discs on a dashed planned line, their
 *     titles in faint ink — so the map spans the frame and the viewer sees how far the journey goes.
 *   • Roadmap build (no `current`): on each topic's cue the paper road extends to its station, the disc is inked (oxblood,
 *     larger, lifted: "here") and its title comes into full ink; earlier stations settle to royal / muted.
 *   • Revisit (`current` = i): stations before i are already reached; the road reaches station i on its cue and that disc
 *     lifts and settles as the clear current station; later stations stay quiet.
 * Positions depend only on the station count, so a station sits in the same place every time the map returns.
 */
const X0 = 230, X1 = 1690, Y_HI = 520, Y_LO = 760, START = { x: 96, y: 660 };
const R = 34, R_NOW = 46, ROAD_W = 42, ROAD_DUR = 0.9, DISC_DELAY = 0.45, LABEL_DELAY = 0.6;

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

  const plan = roadUpTo(pts, pts[pts.length - 1].l);
  const maxW = Math.min(380, (2 * (X1 - X0)) / Math.max(1, n - 1) - 50);

  return (
    <AbsoluteFill style={{ opacity: env.opacity, wordSpacing: textStyle.wordSpacing }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs><PaperTextureDefs id={id} strength={0.2} /></defs>
        {/* the planned route: a fine dashed line the paper road will cover */}
        <path d={plan} stroke={D.hairline} strokeWidth={2.5} fill="none" strokeDasharray="3 12" strokeLinecap="round" />
        {road && (
          <g>
            <path d={road} stroke={D.paperShade} strokeWidth={ROAD_W} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-shadow-1)`} />
            <path d={road} stroke={D.paperShade} strokeWidth={ROAD_W} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-tex)`} />
            <path d={road} stroke={D.paperLight} strokeWidth={ROAD_W - 14} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
            <path d={road} stroke={D.hairline} strokeWidth={3} fill="none" strokeDasharray="14 18" strokeLinecap="round" />
          </g>
        )}
        {/* quiet stations ahead (not yet reached) */}
        {stations.map((s, i) => (i >= shown ? <Ahead key={`g${i}`} pt={st[i]} high={i % 2 === 1} title={s.title} maxW={maxW} /> : null))}
        {stations.slice(0, shown).map((s, i) => (
          <Station key={i} id={id} pt={st[i]} high={i % 2 === 1} title={s.title} at={cue[i]} t={t}
            maxW={maxW} nextAt={i + 1 < shown ? cue[i + 1] : undefined} />
        ))}
        {title && <Title text={title.text} at={title.at} t={t} />}
      </svg>
      <TextureGate />
    </AbsoluteFill>
  );
};

const labelSize = (lines: string[], maxW: number) => Math.max(28, Math.min(36, Math.floor(maxW / Math.max(...lines.map((l) => l.length * 0.55)))));

/** A station not yet reached: a blank paper disc set flat on the route, its title in faint ink. */
const Ahead: React.FC<{ pt: Pt; high: boolean; title: string; maxW: number }> = ({ pt, high, title, maxW }) => {
  const lines = wrap(title);
  const size = labelSize(lines, maxW);
  const lh = size * 1.2;
  const firstY = high ? pt.y - R_NOW - 18 - (lines.length - 1) * lh : pt.y + R_NOW + 18 + size * 0.8;
  return (
    <g>
      <circle cx={pt.x} cy={pt.y} r={R * 0.72} fill={D.paperLight} stroke={D.hairline} strokeWidth={2} />
      <text data-qa-text="" x={pt.x} y={firstY} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.oxbloodMuted} opacity={0.5}>
        {lines.map((l, i) => <tspan key={i} x={pt.x} dy={i ? lh : 0}>{l}</tspan>)}
      </text>
    </g>
  );
};

const Station: React.FC<{ id: string; pt: Pt; high: boolean; title: string; at: number; t: number; nextAt?: number; maxW: number }> = ({ id, pt, high, title, at, t, nextAt, maxW }) => {
  const land = clamp01(t, at + DISC_DELAY, 0.9);
  const lines = wrap(title);
  const size = labelSize(lines, maxW);
  const lh = size * 1.2;
  // "here" (oxblood, larger, lifted) hands over to the next station when it is named
  const handOver = nextAt === undefined ? 0 : clamp01(t, nextAt, 0.8);
  const now = land * (1 - handOver);
  const r = R + (R_NOW - R) * now;
  const lift = 8 * now;
  const label = clamp01(t, at + LABEL_DELAY, 1.1);
  const firstY = high ? pt.y - R_NOW - 18 - (lines.length - 1) * lh : pt.y + R_NOW + 18 + size * 0.8;
  return (
    <g>
      {/* the quiet disc under it until it is reached */}
      {land < 1 && <circle cx={pt.x} cy={pt.y} r={R * 0.72} fill={D.paperLight} stroke={D.hairline} strokeWidth={2} opacity={1 - land} />}
      {land > 0 && (
        <g transform={`translate(${pt.x} ${(pt.y - lift + (1 - land) * -22).toFixed(2)})`} opacity={Math.min(1, land * 4)}>
          <circle r={r} fill={P.royal} filter={`url(#${id}-shadow-${now > 0.5 ? 3 : 2})`} />
          <circle r={r} fill={P.oxblood} opacity={1 - handOver} />
          <circle r={9 + 3 * now} fill={P.paper} />
        </g>
      )}
      {/* faint title until reached; the inked title comes into focus over it */}
      {label < 1 && (
        <text x={pt.x} y={firstY} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={D.oxbloodMuted} opacity={0.5 * (1 - label)}>
          {lines.map((l, i) => <tspan key={i} x={pt.x} dy={i ? lh : 0}>{l}</tspan>)}
        </text>
      )}
      {label > 0 && (
        <text data-qa-text="" x={pt.x} y={firstY} textAnchor="middle" fontFamily={fonts.text} fontSize={size} fill={P.oxblood}
          opacity={label * (1 - 0.42 * handOver)} style={{ filter: label < 1 ? `blur(${((1 - label) * 5).toFixed(2)}px)` : undefined }}>
          {lines.map((l, i) => <tspan key={i} x={pt.x} dy={i ? lh : 0}>{l}</tspan>)}
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
