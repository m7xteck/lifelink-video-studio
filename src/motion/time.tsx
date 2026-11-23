import React, { createContext, useContext } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, motion } from "../brand/tokens";

/** Each scene knows where it sits on the narration timeline. */
export const SceneClock = createContext<{ startSec: number; endSec: number }>({ startSec: 0, endSec: 0 });

/** Seconds elapsed on the master narration timeline at the current frame. */
export const useNarrationTime = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { startSec } = useContext(SceneClock);
  return startSec + frame / fps;
};

/** Progress 0→1 of an animation that begins at absolute narration second `at`. */
export const useProgress = (at: number, durSec = motion.durationsSec.base, easing = ease.enter) => {
  const t = useNarrationTime();
  return interpolate(t, [at, at + durSec], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
};

/** Scene-level envelope: fade in at scene start, fade out across the overlap after scene end. */
export const useSceneEnvelope = () => {
  const t = useNarrationTime();
  const { startSec, endSec } = useContext(SceneClock);
  // Incoming scene waits until the outgoing one is mostly gone: a clean hand-off, never text on text.
  const inStart = startSec + motion.durationsSec.sceneFadeOut * 0.6;
  const inP = interpolate(t, [inStart, inStart + motion.durationsSec.sceneFadeIn], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter,
  });
  const outP = interpolate(t, [endSec, endSec + motion.durationsSec.sceneFadeOut], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter,
  });
  return { opacity: Math.min(inP, outP), inP, outP, t, startSec, endSec };
};

/** Slow, barely-perceptible push-in across the whole scene (no "zoom effect"). */
export const useCameraDrift = (maxScale = motion.cameraDriftMaxScale) => {
  const t = useNarrationTime();
  const { startSec, endSec } = useContext(SceneClock);
  const p = interpolate(t, [startSec, Math.max(startSec + 1, endSec)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle,
  });
  return 1 + (maxScale - 1) * p;
};

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
