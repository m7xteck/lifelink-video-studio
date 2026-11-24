import React from "react";
import { Img, staticFile } from "remotion";

/**
 * Paper texture ON cut-paper shapes (not the ground): an SVG filter that multiplies the studio's pre-rendered
 * grain into whatever the filtered group draws, restricted to its own alpha. Apply with filter={`url(#${id}-tex)`}
 * on a group in a 1920×1080 viewBox SVG. `strength` 0..1 = how dark the darkest grain gets.
 * <TextureGate/> (an invisible Remotion <Img>) makes the renderer wait until the texture is loaded, so the
 * filter's feImage reads it from cache on every frame (no flicker on the first frames).
 */
const SRC = "textures/paper-grain.png";
export const PaperTextureDefs: React.FC<{ id: string; strength?: number }> = ({ id, strength = 0.3 }) => (
  <filter id={`${id}-tex`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480} colorInterpolationFilters="sRGB">
    <feImage href={staticFile(SRC)} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="raw" />
    <feComponentTransfer in="raw" result="tex">
      {(["R", "G", "B"] as const).map((c) => React.createElement(`feFunc${c}`, { key: c, type: "linear", slope: strength, intercept: 1 - strength }))}
    </feComponentTransfer>
    <feComposite in="tex" in2="SourceAlpha" operator="in" result="texIn" />
    <feBlend in="texIn" in2="SourceGraphic" mode="multiply" />
  </filter>
);
export const TextureGate: React.FC = () => (
  <Img src={staticFile(SRC)} style={{ position: "absolute", width: 2, height: 2, opacity: 0, pointerEvents: "none" }} />
);
