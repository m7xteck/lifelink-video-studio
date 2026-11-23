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

/** Scenes stay mounted this long after their end so a longer fade-out can complete. */
export const MAX_SCENE_OVERLAP_SEC = 1.4;

/** Scene-level envelope: fade in at scene start, fade out across the overlap after scene end. */
export const useSceneEnvelope = (opts: { fadeIn?: number; fadeOut?: number } = {}) => {
  const fadeIn = opts.fadeIn ?? motion.durationsSec.sceneFadeIn;
  const fadeOut = Math.min(opts.fadeOut ?? motion.durationsSec.sceneFadeOut, MAX_SCENE_OVERLAP_SEC);
  const t = useNarrationTime();
  const { startSec, endSec } = useContext(SceneClock);
  // Incoming scene waits until the outgoing one is mostly gone: a clean hand-off, never text on text.
  // The very first scene of a video starts fully visible (nothing to hand off from).
  const inStart = startSec + motion.durationsSec.sceneFadeOut * 0.6;
  const inP = startSec <= 0.001 ? 1 : interpolate(t, [inStart, inStart + fadeIn], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle,
  });
  // Ease-in-out on both sides: large brightness changes (dark ground ↔ paper) are spread evenly, never a jump.
  const outP = interpolate(t, [endSec, endSec + fadeOut], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle,
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
