import React from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, Sequence, staticFile, useVideoConfig } from "remotion";
import { ManifestSchema, type Manifest } from "../schema/manifest";
import { Atmosphere } from "../motion/Atmosphere";
import { MAX_SCENE_OVERLAP_SEC, SceneClock } from "../motion/time";
import { SceneRenderer, groundOf } from "../scenes/SceneRenderer";
import { GroundBackdrop } from "../motion/GroundBackdrop";
import { QaGuard } from "../motion/QaGuard";
import { brandWatermark, colors, fonts, palette, textStyle } from "../brand/tokens";

const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 110; };

export type LessonProps = { manifest: Manifest; orientation?: "landscape" | "portrait"; muted?: boolean; qa?: boolean };

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

export const Lesson: React.FC<LessonProps> = ({ manifest, muted = false, qa = true }) => {
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
              <AbsoluteFill data-scene={s.id}><SceneRenderer scene={s} /></AbsoluteFill>
            </SceneClock.Provider>
          </Sequence>
        );
      })}
      {manifest.audio && !muted && <Audio src={staticFile(manifest.audio)} />}
      {(manifest.watermark || brandWatermark) && (
        <div style={{ position: "absolute", top: 28, right: 36, fontFamily: fonts.text, fontSize: 18, letterSpacing: "0.12em", color: colors.inkMuted, background: `${colors.surface}cc`, padding: "6px 12px", borderRadius: 4, textTransform: "uppercase", zIndex: 10 }}>
          {/* While the brand is unapproved the watermark is mandatory, whatever the manifest says. */}
          {manifest.watermark ?? brandWatermark}
        </div>
      )}
      {qa && <QaGuard />}
    </AbsoluteFill>
  );
};
