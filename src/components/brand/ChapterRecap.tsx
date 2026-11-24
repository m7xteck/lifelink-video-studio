import React from "react";
import { AbsoluteFill, Freeze, Img, staticFile, useVideoConfig } from "remotion";
import { ease, fonts, palette } from "../../brand/tokens";
import { SceneClock, useProgress, useSceneEnvelope } from "../../motion/time";
import { SceneSchema, type Scene, type SceneOf } from "../../schema/manifest";
import { SceneRenderer, groundOf } from "../../scenes/SceneRenderer";
import { D, P, SHADOW_2, Stage, fit1, txt } from "./stage";

/*
 * Signature recap: a small, still thumbnail of the chapter's signature picture on a paper card + 1–3 key words.
 *   • single (`signature` + `words`): the card slides up (no rotation) on `cardAt`; each key word is inked beside it.
 *   • lesson end (`items`): several small signature cards appear in order, each with its label, on its cue.
 * The embedded signature is rendered by the normal SceneRenderer on a frozen clock placed after all its cues,
 * so it is fully built and perfectly still (same picture the viewer saw, now as a keepsake).
 */
type Sig = { type: string; props: Record<string, unknown> };
const T_FROZEN = 100000;
/** Signatures that occupy only the centre of their artboard are framed closer (1920×1080 artboard, 16:9 crops). */
const CROP: Record<string, { x: number; y: number; w: number }> = {
  mythTruth: { x: 110, y: 110, w: 1700 },
}; // narration second the thumbnail is frozen at (after every cue, before its own end)

const toScene = (sig: Sig, id: string): Scene | null => {
  const r = SceneSchema.safeParse({ id, sectionId: "recap", startSec: 0, endSec: T_FROZEN + 0.5, type: sig.type, props: sig.props });
  return r.success ? r.data : null;
};

/** The signature, fully built and still, at artboard size (width × height of the video). */
const FrozenSignature: React.FC<{ sig: Sig; id: string }> = ({ sig, id }) => {
  const { fps, width, height } = useVideoConfig();
  const scene = toScene(sig, id);
  if (!scene) return null;
  return (
    <div data-qa-ignore="" style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden", background: groundOf(scene, palette, P.paper) }}>
      <Freeze frame={Math.round(T_FROZEN * fps)}>
        <SceneClock.Provider value={{ startSec: 0, endSec: T_FROZEN + 0.5 }}>
          <AbsoluteFill><SceneRenderer scene={scene} /></AbsoluteFill>
        </SceneClock.Provider>
      </Freeze>
    </div>
  );
};

/** Paper card (textured mat, hairline inner frame, thumbnail) of artboard width `w`, lifting 40 px into place on `at`. */
const Card: React.FC<{ sig: Sig; id: string; at: number; w: number; x: number; y: number }> = ({ sig, id, at, w, x, y }) => {
  const { width, height } = useVideoConfig();
  const p = useProgress(at, 1.1, ease.settle);
  if (p <= 0) return null;
  const h = (w * height) / width, mat = Math.max(8, Math.round(w * 0.026));
  // optional closer framing (landscape artboard only)
  const c = width === 1920 && height === 1080 ? CROP[sig.type] : undefined;
  const s = c ? w / c.w : w / width;
  const ox = c ? -c.x * s : 0, oy = c ? -c.y * s : 0;
  return (
    <div style={{ position: "absolute", left: x - mat, top: y - mat, width: w + mat * 2, height: h + mat * 2, borderRadius: 3,
      filter: SHADOW_2, opacity: Math.min(1, p * 3), transform: `translateY(${((1 - p) * 40).toFixed(2)}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: D.paperLight, borderRadius: 3, overflow: "hidden" }}>
        <Img src={staticFile("textures/paper-grain.png")} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, mixBlendMode: "multiply", opacity: 0.35 }} />
      </div>
      <div style={{ position: "absolute", left: mat, top: mat, width: w, height: h, overflow: "hidden" }}>
        <div style={{ width, height, transform: `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px) scale(${s})`, transformOrigin: "0 0" }}>
          <FrozenSignature sig={sig} id={id} />
        </div>
      </div>
      {/* the thumbnail's cut edge: a fine hairline, like a print set into a mount */}
      <div style={{ position: "absolute", left: mat - 1, top: mat - 1, width: w + 2, height: h + 2, boxShadow: `inset 0 0 0 1px ${D.hairline}`, pointerEvents: "none" }} />
    </div>
  );
};

/** A key word inked left→right on its cue, with a short rose rule drawn before it. */
const KeyWord: React.FC<{ text: string; at: number; size: number }> = ({ text, at, size }) => {
  const p = useProgress(at, Math.min(1.4, 0.5 + text.length * 0.05), ease.settle);
  const tab = useProgress(at, 0.7, ease.settle);
  // before its cue the word still holds its place (hidden), so the column never re-centres as words arrive
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge + 3}%)`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4, marginBottom: size * 0.42, visibility: p > 0 ? "visible" : "hidden" }}>
      <div style={{ width: size * 0.5, flex: "none", display: "flex" }}><div style={{ width: size * 0.5 * tab, height: 2, background: P.rose }} /></div>
      <div style={{ WebkitMaskImage: p < 1 ? mask : undefined, maskImage: p < 1 ? mask : undefined }}>
        <span data-qa-text={p > 0 ? "" : undefined} style={{ ...txt(size, P.oxblood), whiteSpace: "nowrap" }}>{text}</span>
      </div>
    </div>
  );
};

const Heading: React.FC<{ text: string; at: number; size: number; style?: React.CSSProperties }> = ({ text, at, size, style }) => {
  const p = useProgress(at, 1.2, ease.settle);
  return <div data-qa-text={p > 0 ? "" : undefined} style={{ ...txt(size, D.oxbloodMuted), opacity: p, filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : undefined, whiteSpace: "nowrap", ...style }}>{text}</div>;
};

export const ChapterRecap: React.FC<{ scene: SceneOf<"chapterRecap"> }> = ({ scene }) => {
  const { title, signature, words, items, cardAt } = scene.props;
  const env = useSceneEnvelope({ fadeIn: 0.9, fadeOut: 0.9 });
  return (
    <AbsoluteFill style={{ opacity: env.opacity }}>
      <Stage>
        {items && items.length ? <Grid scene={scene} items={items} title={title} /> : (
          <>
            {signature && <Card sig={signature} id={`${scene.id}-sig`} at={cardAt ?? scene.startSec} w={864} x={150} y={297} />}
            <div style={{ position: "absolute", left: signature ? 1130 : 300, top: 0, bottom: 0, width: signature ? 680 : 1320, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {title && <Heading text={title.text} at={title.at} size={fit1(title.text, 40, 640)} style={{ marginBottom: 34 }} />}
              {words.map((w, i) => <KeyWord key={i} text={w.text} at={w.at} size={Math.min(...words.map((x) => fit1(x.text, 76, 560)))} />)}
            </div>
          </>
        )}
      </Stage>
    </AbsoluteFill>
  );
};

/** Lesson-end recap: cards on a grid (≤ 4 per row), filled in reading order on their cues. */
const Grid: React.FC<{ scene: SceneOf<"chapterRecap">; items: NonNullable<SceneOf<"chapterRecap">["props"]["items"]>; title?: { text: string; at: number } }> = ({ scene, items, title }) => {
  const n = items.length;
  const cols = n <= 3 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const top = title ? 200 : 110, bottom = 1000, gapX = 56, labelH = 64, gapY = 34;
  const availW = 1640, availH = bottom - top;
  const wByW = (availW - gapX * (cols - 1)) / cols;
  const wByH = ((availH - (rows - 1) * gapY) / rows - labelH) * (16 / 9);
  const w = Math.floor(Math.min(wByW, wByH, 760));
  const h = (w * 9) / 16;
  const gridW = cols * w + (cols - 1) * gapX, gridH = rows * (h + labelH) + (rows - 1) * gapY;
  const x0 = (1920 - gridW) / 2, y0 = top + (availH - gridH) / 2;
  const labelSize = Math.max(26, Math.min(36, Math.round(w / 13)));
  return (
    <>
      {title && <Heading text={title.text} at={title.at} size={46} style={{ position: "absolute", left: x0, top: 96 }} />}
      {items.map((it, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        // last row centred when it is short
        const inRow = r === rows - 1 ? n - r * cols : cols;
        const rowX = x0 + ((cols - inRow) * (w + gapX)) / 2;
        const x = rowX + c * (w + gapX), y = y0 + r * (h + labelH + gapY);
        return (
          <React.Fragment key={i}>
            <Card sig={it.signature} id={`${scene.id}-i${i}`} at={it.at} w={w} x={x} y={y} />
            <GridLabel text={it.label} at={it.at + 0.35} x={x} y={y + h + 20} w={w} size={fit1(it.label, labelSize, w)} />
          </React.Fragment>
        );
      })}
    </>
  );
};

const GridLabel: React.FC<{ text: string; at: number; x: number; y: number; w: number; size: number }> = ({ text, at, x, y, w, size }) => {
  const p = useProgress(at, 1.0, ease.settle);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: "center", opacity: p, filter: p < 1 ? `blur(${((1 - p) * 5).toFixed(2)}px)` : undefined }}>
      <span data-qa-text="" style={{ fontFamily: fonts.text, ...txt(size, P.oxblood), whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};
