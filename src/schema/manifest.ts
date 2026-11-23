import { z } from "zod";

/**
 * A lesson is described entirely by data (a "scene manifest").
 * All times are in SECONDS on the original narration timeline, taken from the
 * word-level transcript — never from a guessed reading speed.
 */

const Emphasis = z.array(z.string()).default([]);

export const SceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sectionTitle"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({ index: z.number().int().optional(), title: z.string(), kicker: z.string().optional() }),
  }),
  z.object({
    type: z.literal("kineticStatement"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({
      /** Lines of the statement. Each line can be timed to the moment it is spoken. */
      lines: z.array(z.object({ text: z.string(), at: z.number() })),
      emphasis: Emphasis,
      align: z.enum(["left", "center"]).default("left"),
      scale: z.enum(["hero", "h1", "h2"]).default("h1"),
    }),
  }),
  z.object({
    type: z.literal("quietReflection"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({ text: z.string(), at: z.number().optional(), attribution: z.string().optional() }),
  }),
  z.object({
    type: z.literal("stepsDiagram"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({
      heading: z.string().optional(),
      steps: z.array(z.object({ label: z.string(), detail: z.string().optional(), at: z.number() })).min(2).max(6),
      layout: z.enum(["path", "stack"]).default("path"),
    }),
  }),
  z.object({
    type: z.literal("connectionMetaphor"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({
      leftLabel: z.string(), rightLabel: z.string(),
      sharedLabel: z.string().optional(),
      /** Moment (sec) when the two forms begin to overlap. */
      convergeAt: z.number(),
      caption: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("comparison"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({
      left: z.object({ title: z.string(), points: z.array(z.string()).max(4), at: z.number() }),
      right: z.object({ title: z.string(), points: z.array(z.string()).max(4), at: z.number() }),
      preferred: z.enum(["left", "right", "none"]).default("none"),
    }),
  }),
  z.object({
    type: z.literal("takeaway"),
    id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number(),
    props: z.object({
      heading: z.string().default("Key takeaways"),
      points: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(5),
    }),
  }),
]);

export const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  lessonId: z.string(),
  courseId: z.string(),
  title: z.string(),
  fps: z.number().int().default(30),
  width: z.number().int().default(1920),
  height: z.number().int().default(1080),
  durationSec: z.number().positive(),
  /** Path inside /public, e.g. "audio/lesson-id.wav". null = silent visual test. */
  audio: z.string().nullable(),
  /** Labels shown on test renders so they are never mistaken for final branded work. */
  watermark: z.string().nullable().default(null),
  sections: z.array(z.object({ id: z.string(), title: z.string(), startSec: z.number(), endSec: z.number() })).min(1),
  scenes: z.array(SceneSchema).min(1),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneOf<T extends Scene["type"]> = Extract<Scene, { type: T }>;
