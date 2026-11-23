import React from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, Sequence, staticFile, useVideoConfig } from "remotion";
import { ManifestSchema, type Manifest } from "../schema/manifest";
import { Atmosphere } from "../motion/Atmosphere";
import { SceneClock } from "../motion/time";
import { SceneRenderer } from "../scenes/SceneRenderer";
import { QaGuard } from "../motion/QaGuard";
import { colors, fonts, motion } from "../brand/tokens";

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
  const overlap = motion.durationsSec.sceneFadeOut; // scenes cross-dissolve over this window
  return (
    <AbsoluteFill style={{ backgroundColor: colors.backgroundDeep }}>
      <Atmosphere />
      {manifest.scenes.map((s) => {
        const from = Math.round(s.startSec * fps);
        const dur = Math.max(1, Math.round((s.endSec + overlap) * fps) - from);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={`${s.id} · ${s.type}`} layout="none">
            <SceneClock.Provider value={{ startSec: s.startSec, endSec: s.endSec }}>
              <AbsoluteFill data-scene={s.id}><SceneRenderer scene={s} /></AbsoluteFill>
            </SceneClock.Provider>
          </Sequence>
        );
      })}
      {manifest.audio && !muted && <Audio src={staticFile(manifest.audio)} />}
      {manifest.watermark && (
        <div style={{ position: "absolute", top: 28, right: 36, fontFamily: fonts.text, fontSize: 18, letterSpacing: "0.12em", color: colors.inkMuted, opacity: 0.7, textTransform: "uppercase" }}>
          {manifest.watermark}
        </div>
      )}
      {qa && <QaGuard />}
    </AbsoluteFill>
  );
};
