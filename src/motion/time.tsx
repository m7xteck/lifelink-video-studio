import React, { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, motion } from "../brand/tokens";

/** Each scene knows where it sits on the narration timeline. */
export const SceneClock = createContext<{ startSec: number; endSec: number; afterDark?: boolean }>({ startSec: 0, endSec: 0 });

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

/** Scenes stay mounted this long after their end so a longer fade-out can complete (full-colour grounds need ~2.3 s). */
export const MAX_SCENE_OVERLAP_SEC = 2.4;

/** The client-approved opening (s001–s007, 0–60 s) keeps its original timing exactly: every timing change below is gated on this. */
export const APPROVED_OPENING_END_SEC = 60;

/**
 * Brightness hand-offs (full-colour ground ↔ paper) run over this long, on a symmetric sine curve, so the luma change is spread
 * evenly (10–90 % of the change takes ~1.2 s) instead of the 0.5–0.8 s swing a steep settle curve produces (v004 review).
 */
export const GROUND_FADE_SEC = 2.0;
const sineInOut = Easing.inOut(Easing.sin);

/** Scene-level envelope: fade in at scene start, fade out across the overlap after scene end. */
export const useSceneEnvelope = (opts: { fadeIn?: number; fadeOut?: number } = {}) => {
  const clock = useContext(SceneClock);
  const t = useNarrationTime();
  const { startSec, endSec } = clock;
  const legacy = startSec < APPROVED_OPENING_END_SEC;
  const fadeOut = Math.min(opts.fadeOut ?? motion.durationsSec.sceneFadeOut, MAX_SCENE_OVERLAP_SEC);
  let inP: number;
  if (startSec <= 0.001) inP = 1; // the very first scene of a video starts fully visible (nothing to hand off from)
  else if (legacy) {
    // approved opening: original hand-off (incoming waits until the outgoing one is mostly gone)
    const fadeIn = Math.max(opts.fadeIn ?? motion.durationsSec.sceneFadeIn, clock.afterDark ? 1.3 : 0);
    const inStart = startSec + motion.durationsSec.sceneFadeOut * 0.6;
    inP = interpolate(t, [inStart, inStart + fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  } else if (clock.afterDark) {
    // after a full-colour ground: the paper scene rises over the (held) dark ground on an even sine, never a flash
    inP = interpolate(t, [startSec, startSec + Math.max(GROUND_FADE_SEC, opts.fadeIn ?? 0)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: sineInOut });
  } else {
    // within the narration the hand-offs overlap: the incoming scene starts 0.1 s in, while the outgoing one is still
    // ~85 % visible, so the frame never dips to bare paper between two scenes (v004: 0.3–0.6 s "blinks")
    const fadeIn = opts.fadeIn ?? motion.durationsSec.sceneFadeIn;
    const inStart = startSec + 0.1;
    inP = interpolate(t, [inStart, inStart + fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle });
  }
  // Ease-in-out on both sides: large brightness changes (dark ground ↔ paper) are spread evenly, never a jump.
  const outP = interpolate(t, [endSec, endSec + fadeOut], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.settle,
  });
  return { opacity: Math.min(inP, outP), inP, outP, t, startSec, endSec };
};

/**
 * Envelope for scenes on a full-colour ground (royal / oxblood). The scene is built as paper underlay + coloured ground +
 * content, so the brightness change is controlled here and nowhere else:
 *  - `wrap`: the whole scene, paper on paper, crossfades over the outgoing scene in 0.4 s (no luma change), and leaves
 *    only after the ground has been fully covered/handed back;
 *  - `ground`: the coloured ground rises from paper over GROUND_FADE_SEC on a sine; at the end it returns to paper on a
 *    sine (2.3 s) while the next scene rises over it (useSceneEnvelope afterDark, 2 s sine);
 *  - `content`: the scene's type leaves in 0.6 s at the end, so it never shows through the incoming scene.
 */
export const useGroundEnvelope = () => {
  const { startSec, endSec } = useContext(SceneClock);
  const t = useNarrationTime();
  const c = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const wrapIn = startSec <= 0.001 ? 1 : interpolate(t, [startSec, startSec + 0.4], [0, 1], { ...c, easing: ease.settle });
  const wrapOut = interpolate(t, [endSec + GROUND_FADE_SEC + 0.3, endSec + MAX_SCENE_OVERLAP_SEC], [1, 0], c);
  const groundIn = startSec <= 0.001 ? 1 : interpolate(t, [startSec, startSec + GROUND_FADE_SEC], [0, 1], { ...c, easing: sineInOut });
  // hand back to paper on a slightly slower sine than the incoming scene's rise: if the next scene is opaque paper it
  // governs the change; if it is not (illustration stages without a full ground) the ground still leaves evenly, never a jump
  const groundOut = interpolate(t, [endSec, endSec + GROUND_FADE_SEC + 0.3], [1, 0], { ...c, easing: sineInOut });
  const content = interpolate(t, [endSec, endSec + 0.6], [1, 0], { ...c, easing: ease.settle });
  return { wrap: Math.min(wrapIn, wrapOut), ground: Math.min(groundIn, groundOut), content, t, startSec, endSec };
};

/**
 * Entrance pre-roll guard (v004 review: 2–4 s of blank frame while the narrator is already speaking).
 * Scene starts are placed on the first spoken word of the scene, except at chapter openers (the first scene of a section,
 * id ending "-01"), where the boundary often sits in a pause. So: if the first element's cue is more than ~0.5 s after the
 * scene starts, it enters 0.3 s after the start instead, i.e. with the narrator's first words of that sentence.
 *  - `leadAt` (optional scene prop) overrides: the scene's first spoken word, set explicitly from the transcript.
 *  - chapter openers keep their cue unless `opener: true` is passed (labels/kickers that may sit in the pause).
 *  - the approved opening (< 60 s) is never changed.
 * Returns the time the first element should enter.
 */
export const useLeadIn = (scene: { id: string; startSec: number; props: object }, firstAt: number, opts: { opener?: boolean } = {}) => {
  const leadAt = (scene.props as { leadAt?: number }).leadAt;
  if (scene.startSec < APPROVED_OPENING_END_SEC) return firstAt;
  if (leadAt != null) return Math.min(firstAt, leadAt);
  const isOpener = /-01$/.test(scene.id);
  if (isOpener && !opts.opener) return firstAt;
  return firstAt - scene.startSec > 0.55 ? scene.startSec + 0.3 : firstAt;
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
