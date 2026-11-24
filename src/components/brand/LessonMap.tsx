import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { brand, ease, fonts, textStyle } from "../../brand/tokens";
import { useLayout } from "../../motion/layout";
import { useNarrationTime, useSceneEnvelope } from "../../motion/time";
import { PaperDefs } from "../../illustrations/paper";
import { PaperTextureDefs, TextureGate } from "./paperTexture";
import type { SceneOf } from "../../schema/manifest";
import { SHADOW_1, Stage, txt } from "./stage";

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
 *   • `captions` (optional): what the narrator says about the active stop is carried on a paper tag in the band above the
 *     map, joined to that station by a fine leader rule; one caption at a time, each on its cue. With captions the map rests
 *     at 92 % and, while a caption is showing, eases in to full size around the active station (soft settle, ≤ 160 px
 *     travel); between topics it eases back out. Settled frames are still.
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

/* ---- captions + camera ---- */
const CAM_REST = 0.92, CAM_NEAR = 1.0, CAM_C = { x: 960, y: 600 };
const CAM_IN = 1.6, CAM_OUT = 1.4, CAM_MERGE = 6;      // captions closer than CAM_MERGE s keep the view in
const MAP_X = [92, 1850];                               // map content extent (titles included) at scale 1
const SAFE_X = [60, 1860];
const TAG_TOP = 222, TAG_PAD_X = 30, TAG_H = 84, CAP_SIZE = 44;
const smooth = (t: number, a: number, dur: number) => interpolate(t, [a, a + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
const capSize = (text: string) => Math.max(38, Math.min(CAP_SIZE, Math.floor(1500 / Math.max(1, text.length * 0.5))));
const capWidth = (text: string, size: number) => text.length * size * 0.5 + TAG_PAD_X * 2;

type Cap = { text: string; at: number; until: number; station: number; joinPrev: boolean; joinNext: boolean; nextAt: number };

export const LessonMap: React.FC<{ scene: SceneOf<"lessonMap"> }> = ({ scene }) => {
  const { stations, current, title, captions = [] } = scene.props;
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

  // captions: each belongs to the station that is current when it is spoken
  const sorted = [...captions].sort((a, b) => a.at - b.at);
  const stationAt = (time: number) => { let k = 0; for (let i = 0; i < shown; i++) if (cue[i] <= time) k = i; return k; };
  const caps: Cap[] = sorted.map((c, i) => {
    const nextCap = sorted[i + 1]?.at ?? Infinity;
    const nextStation = stations.slice(0, shown).map((s2, k) => cue[k]).find((a) => a > c.at) ?? Infinity;
    const until = c.until ?? Math.min(nextCap - 0.1, nextStation, scene.endSec - 0.3);
    return { text: c.text, at: c.at, until, station: stationAt(c.at), joinPrev: false, joinNext: false, nextAt: nextCap };
  });
  caps.forEach((c, i) => { const nx = caps[i + 1]; if (nx && nx.station === c.station && nx.at - c.until < 0.6) { c.joinNext = true; nx.joinPrev = true; } });
  // camera: in while captions run (gaps < CAM_MERGE s keep it in), focal point follows the captions' station
  const spans: [number, number][] = [];
  for (const c of caps) { const last = spans[spans.length - 1]; if (last && c.at - last[1] < CAM_MERGE) last[1] = Math.max(last[1], c.until); else spans.push([c.at, c.until]); }
  const near = spans.reduce((m, [a, b]) => Math.max(m, smooth(t, a - 0.2, CAM_IN) * (1 - smooth(t, b, CAM_OUT))), 0);
  let fx = caps.length ? st[caps[0].station].x : CAM_C.x, fy = caps.length ? st[caps[0].station].y : CAM_C.y;
  caps.forEach((c, i) => {
    if (i === 0 || c.station === caps[i - 1].station) return;
    // the view travels with the road to the new station (or with the caption, if the station was reached earlier)
    const go = Math.max(caps[i - 1].at, Math.min(c.at, cue[c.station] + DISC_DELAY));
    const k = smooth(t, go, CAM_IN);
    fx += (st[c.station].x - fx) * k; fy += (st[c.station].y - fy) * k;
  });
  const sc = caps.length ? CAM_REST + (CAM_NEAR - CAM_REST) * near : 1;
  // rest: scaled about the frame centre; near: scaled about the active station (it holds its place), clamped so the
  // whole map stays inside the safe area
  const restT = { x: CAM_C.x * (1 - CAM_REST), y: CAM_C.y * (1 - CAM_REST) };
  const nearT = { x: restT.x + CAM_REST * fx - CAM_NEAR * fx, y: restT.y + CAM_REST * fy - CAM_NEAR * fy };
  nearT.x = Math.max(SAFE_X[0] - MAP_X[0] * CAM_NEAR, Math.min(SAFE_X[1] - MAP_X[1] * CAM_NEAR, nearT.x));
  const tx = caps.length ? restT.x + (nearT.x - restT.x) * near : 0, ty = caps.length ? restT.y + (nearT.y - restT.y) * near : 0;
  const view = (p: Pt) => ({ x: sc * p.x + tx, y: sc * p.y + ty });

  return (
    <AbsoluteFill style={{ opacity: env.opacity, wordSpacing: textStyle.wordSpacing }}>
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" width={L.width} height={L.height} style={{ position: "absolute", inset: 0 }}>
        <PaperDefs id={id} />
        <defs><PaperTextureDefs id={id} strength={0.2} /></defs>
        <g transform={caps.length ? `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sc.toFixed(4)})` : undefined}>
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
        </g>
        {title && <Title text={title.text} at={title.at} t={t} />}
        {caps.map((c, i) => {
          const pt = st[c.station], high = c.station % 2 === 1;
          const lines = wrap(stations[c.station].title);
          const size = labelSize(lines, maxW);
          const top = high ? pt.y - R_NOW - 18 - (lines.length - 1) * size * 1.2 - size * 0.95 : pt.y - R_NOW - 10;
          return <CaptionLeader key={i} cap={c} t={t} from={view({ x: pt.x, y: 0 }).x} to={view({ x: pt.x, y: top })} />;
        })}
      </svg>
      {caps.length > 0 && (
        <Stage>
          {caps.map((c, i) => <CaptionTag key={i} cap={c} t={t} x={view(st[c.station]).x} />)}
        </Stage>
      )}
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

/** Where the tag sits: centred over its station, clamped inside the safe area. */
const tagBox = (text: string, x: number) => {
  const size = capSize(text), w = capWidth(text, size);
  const cx = Math.max(96 + w / 2, Math.min(1824 - w / 2, x));
  return { size, w, cx };
};
const capIn = (c: Cap, t: number) => (c.joinPrev ? smooth(t, c.at, 0.7) : smooth(t, c.at, 0.9));
const capOut = (c: Cap, t: number) => smooth(t, c.until - 0.35, 0.35);

/** The caption: a paper tag (rose edge) in the band above the map; the words come into focus as the tag settles. */
const CaptionTag: React.FC<{ cap: Cap; t: number; x: number }> = ({ cap, t, x }) => {
  const p = capIn(cap, t), q = capOut(cap, t);
  if (p <= 0 || q >= 1) return null;
  const { size, w, cx } = tagBox(cap.text, x);
  const rise = (1 - p) * 12;
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: TAG_TOP - rise, width: w, height: TAG_H, opacity: Math.min(1, p * 2) * (1 - q), filter: SHADOW_1 }}>
      <div style={{ position: "absolute", inset: 0, background: D.paperLight, borderRadius: 4 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, background: P.rose, borderRadius: "4px 4px 0 0" }} />
      <div data-qa-text="" style={txt(size, P.oxblood, { position: "absolute", left: 0, right: 0, top: (TAG_H - size * 1.22) / 2 + 3, textAlign: "center", whiteSpace: "nowrap",
        filter: p < 1 ? `blur(${((1 - p) * 5).toFixed(2)}px)` : undefined })}>{cap.text}</div>
    </div>
  );
};

/** Fine leader rule from the tag down to its station (to the disc, or to the top of a raised station's title). */
const CaptionLeader: React.FC<{ cap: Cap; t: number; from: number; to: Pt }> = ({ cap, t, from, to }) => {
  const draw = cap.joinPrev ? 1 : smooth(t, cap.at + 0.15, 0.6);
  const q = cap.joinNext ? 0 : capOut(cap, t);
  if (t < cap.at || draw <= 0 || q >= 1 || (cap.joinNext && t >= cap.nextAt)) return null;
  const { w, cx } = tagBox(cap.text, from);
  const x0 = Math.max(cx - w / 2 + 28, Math.min(cx + w / 2 - 28, to.x));
  const y0 = TAG_TOP + TAG_H + 2;
  const d = `M${x0.toFixed(1)},${y0} L${to.x.toFixed(1)},${to.y.toFixed(1)}`;
  return (
    <g opacity={1 - q}>
      <path d={d} stroke={P.oxblood} strokeWidth={1.6} fill="none" opacity={0.7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      {draw > 0.95 && <circle cx={to.x} cy={to.y} r={3.5} fill={P.oxblood} opacity={0.8} />}
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
