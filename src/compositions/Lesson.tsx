import React from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ManifestSchema, type Manifest } from "../schema/manifest";
import { Atmosphere } from "../motion/Atmosphere";
import { MAX_SCENE_OVERLAP_SEC, SceneClock } from "../motion/time";
import { SceneRenderer, groundOf } from "../scenes/SceneRenderer";
import { GroundBackdrop } from "../motion/GroundBackdrop";
import { QaGuard } from "../motion/QaGuard";
import { brandWatermark, isApprovedBrand, colors, fonts, palette, textStyle } from "../brand/tokens";

/**
 * Living hold (client request 2026-11-24: nothing should sit frozen during long explanations):
 * a slow documentary push-in per scene at constant speed, so every 8 s window moves.
 * Rate = min(0.0006/s, 3.5% over the scene); eases in over the first 2 s. Scale starts at 1.0, so entrances are untouched.
 */
const PushIn: React.FC<{ durSec: number; children: React.ReactNode }> = ({ durSec, children }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps; // scene-relative (inside the Sequence)
  const rate = Math.min(0.0006, 0.035 / Math.max(1, durSec));
  const eased = t < 2 ? (t * t) / 4 : t - 1; // C1-continuous ramp from rest
  const k = 1 + rate * Math.max(0, eased);
  return <AbsoluteFill style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: "50% 46%" }}>{children}</AbsoluteFill>;
};

const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 110; };

export type LessonProps = { manifest: Manifest; orientation?: "landscape" | "portrait"; muted?: boolean; qa?: boolean; final?: boolean };

/** Duration and size come from the manifest — the narration is the master timeline. */
export const calculateLessonMetadata: CalculateMetadataFunction<LessonProps> = ({ props }) => {
  const m = ManifestSchema.parse(props.manifest);
  const portrait = props.orientation === "portrait";
  return {
    fps: m.fps,
    durationInFrames: Math.ceil(m.durationSec * m.fps),
    width: portrait ? 1080 : m.width,
    height: portrait ? 1920 : m.height,
    props: { ...props, manifest: m },
  };
};

export const Lesson: React.FC<LessonProps> = ({ manifest, muted = false, qa = true, final = false }) => {
  const watermark = final && isApprovedBrand ? null : manifest.watermark ?? brandWatermark; // clean only for an approved lesson on a locked brand
  const { fps } = useVideoConfig();
  const overlap = MAX_SCENE_OVERLAP_SEC; // scenes stay mounted while their fade-out completes
  return (
    <AbsoluteFill style={{ backgroundColor: colors.backgroundDeep }}>
      {/* Word-spacing correction for the body face, resolved at each text element's own size (em). Script sets its own. */}
      <style>{`[data-scene] [data-qa-text] { word-spacing: ${textStyle.wordSpacing}; }`}</style>
      <Atmosphere />
      <GroundBackdrop grounds={manifest.scenes.map((s) => ({ startSec: s.startSec, endSec: s.endSec, color: groundOf(s, palette, colors.background) }))} />
      {manifest.scenes.map((s, i) => {
        const from = Math.round(s.startSec * fps);
        const dur = Math.max(1, Math.round((s.endSec + overlap) * fps) - from);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={`${s.id} · ${s.type}`} layout="none">
            <SceneClock.Provider value={{ startSec: s.startSec, endSec: s.endSec, afterDark: i > 0 && isDark(groundOf(manifest.scenes[i - 1], palette, colors.background)) }}>
              <AbsoluteFill data-scene={s.id}><PushIn durSec={s.endSec - s.startSec}><SceneRenderer scene={s} /></PushIn></AbsoluteFill>
            </SceneClock.Provider>
          </Sequence>
        );
      })}
      {manifest.audio && !muted && <Audio src={staticFile(manifest.audio)} />}
      {watermark && (
        <div style={{ position: "absolute", top: 28, right: 36, fontFamily: fonts.text, fontSize: 18, letterSpacing: "0.12em", color: colors.inkMuted, background: `${colors.surface}cc`, padding: "6px 12px", borderRadius: 4, textTransform: "uppercase", zIndex: 10 }}>
          {watermark}
        </div>
      )}
      {qa && <QaGuard />}
    </AbsoluteFill>
  );
};
