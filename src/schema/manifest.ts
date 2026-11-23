import { z } from "zod";

/**
 * A lesson is described entirely by data (a "scene manifest").
 * All times are in SECONDS on the original narration timeline, taken from the
 * word-level transcript — never from a guessed reading speed.
 */

const Emphasis = z.array(z.string()).default([]);

const CoreSceneSchemas = [
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
      kicker: z.object({ text: z.string(), at: z.number() }).optional(),
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
] as const;


/* ---- LifeLink brand-proposal scene types (concepts v1) ---- */
const Base = { id: z.string(), sectionId: z.string(), startSec: z.number(), endSec: z.number() };
export const BrandSceneSchemas = [
  z.object({ ...Base, type: z.literal("courseIntro"), props: z.object({
    courseLabel: z.string().default("Course"), courseTitle: z.string(), lessonLabel: z.string(), lessonTitle: z.string(), at: z.number(),
    titleAt: z.number().optional(), credit: z.object({ text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("statementCollision"), props: z.object({
    label: z.string().optional(),
    first: z.object({ text: z.string(), at: z.number() }),
    script: z.object({ text: z.string(), at: z.number() }),
    second: z.object({ text: z.string(), at: z.number() }),
    caption: z.object({ text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("introductionPath"), props: z.object({
    label: z.string().optional(), heading: z.string(),
    stages: z.array(z.object({ label: z.string(), detail: z.string().optional(), at: z.number() })).min(2).max(4),
    outcome: z.object({ text: z.string(), caption: z.string().optional(), at: z.number() }),
  }) }),
  z.object({ ...Base, type: z.literal("reflectionField"), props: z.object({
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(4),
    script: z.object({ text: z.string(), at: z.number() }).optional(),
    after: z.array(z.object({ text: z.string(), at: z.number() })).max(2).optional(),
    ground: z.enum(["oxblood", "royal"]).default("oxblood"),
  }) }),
  z.object({ ...Base, type: z.literal("summaryLedger"), props: z.object({
    heading: z.string().default("In summary"), sublabel: z.string().optional(),
    points: z.array(z.object({ text: z.string(), at: z.number() })).min(2).max(5),
    signoff: z.object({ text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("parallelPhrases"), props: z.object({
    kicker: z.object({ text: z.string(), at: z.number() }).optional(),
    items: z.array(z.object({ text: z.string(), at: z.number() })).min(2).max(4),
    closing: z.object({ lead: z.string().optional(), leadAt: z.number().optional(), text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("pathLandscape"), props: z.object({
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(3),
    script: z.object({ text: z.string(), at: z.number() }).optional(),
    firstStepAt: z.number(),
  }) }),
  z.object({ ...Base, type: z.literal("convergingPaths"), props: z.object({
    kicker: z.object({ text: z.string(), at: z.number() }).optional(),
    items: z.array(z.object({ text: z.string(), at: z.number() })).min(2).max(4),
    closing: z.object({ lead: z.string().optional(), leadAt: z.number().optional(), text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("findingBecoming"), props: z.object({
    kicker: z.object({ text: z.string(), at: z.number() }).optional(),
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(2).max(4),
    emphasis: z.array(z.string()).default([]),
    findAt: z.number(), becomeAt: z.number(),
  }) }),
] as const;

export const SceneSchema = z.discriminatedUnion("type", [...CoreSceneSchemas, ...BrandSceneSchemas]);

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
