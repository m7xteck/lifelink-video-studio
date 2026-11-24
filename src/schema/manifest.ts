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
      /** Entrance: "rise" (words rise from a mask), "focus" (words come into focus, no movement), "ink" (line written left→right). Omit to vary automatically by scene. */
      reveal: z.enum(["rise", "focus", "ink"]).optional(),
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
  /* ---- variety v2 text treatments (no kicker, no rule) ---- */
  z.object({ ...Base, type: z.literal("highlightLine"), props: z.object({
    /** One sentence, authored line breaks; each line fades in word by word as spoken. */
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(3),
    /** Key words (must sit inside one line, verbatim); a marker sweep draws behind them at `at`. */
    highlight: z.object({ text: z.string(), at: z.number() }),
    tint: z.enum(["sky", "royal"]).default("sky"),
  }) }),
  z.object({ ...Base, type: z.literal("pullQuote"), props: z.object({
    /** The narrator's sentence; the paper quote mark lands just before the first line. */
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(4),
    emphasis: z.array(z.string()).default([]),
    attribution: z.object({ text: z.string(), at: z.number() }).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("questionPrompt"), props: z.object({
    lines: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(4),
    /** When the script "?" is cut (defaults to just before the first line). */
    markAt: z.number().optional(),
    ground: z.enum(["paper", "royal"]).default("paper"),
  }) }),
  z.object({ ...Base, type: z.literal("wordStack"), props: z.object({
    /** Optional plain lead-in sentence (sentence case, not a tracked kicker). */
    lead: z.object({ text: z.string(), at: z.number() }).optional(),
    words: z.array(z.object({ text: z.string(), at: z.number() })).min(2).max(4),
  }) }),
  /* ---- variety v2 signature illustrations (motion designer) ---- */
  z.object({ ...Base, type: z.literal("threePillars"), props: z.object({
    /** Exactly three columns; each rises on `at` (its name), script `word` under it, `meaning` sets on `meaningAt`. */
    pillars: z.array(z.object({ word: z.string(), at: z.number(), meaning: z.string().optional(), meaningAt: z.number().optional() })).length(3),
    baseAt: z.number().optional(), lintelAt: z.number().optional(),
    /** Revisits: one column index, or timed steps ({index:null} = all full). Others dim to 35%. */
    focus: z.union([z.number().int().min(0).max(2), z.array(z.object({ index: z.number().int().min(0).max(2).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("foundationLayers"), props: z.object({
    /** Courses bottom-up; label sets on `at`, each brick (item) laid on its own `at`. */
    courses: z.array(z.object({ label: z.string(), at: z.number(), items: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(4) })).min(1).max(4),
    groundAt: z.number().optional(),
    focus: z.union([z.number().int().min(0).max(3), z.array(z.object({ index: z.number().int().min(0).max(3).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("iceberg"), props: z.object({
    /** Peak emerges on `peakAt`; waterline draws on `waterlineAt`; hidden mass revealed on `massAt` ("at home"). */
    peakAt: z.number(), waterlineAt: z.number(), massAt: z.number(),
    /** Up to 4 public traits beside the peak / 4 private situations inside the mass, each on its cue. */
    above: z.array(z.object({ text: z.string(), at: z.number() })).max(4).optional(),
    below: z.array(z.object({ text: z.string(), at: z.number() })).max(4).optional(),
    /** Script zone labels (≤ 2 words, lowercase), e.g. "seen" / "at home". */
    aboveLabel: z.object({ text: z.string(), at: z.number() }).optional(),
    belowLabel: z.object({ text: z.string(), at: z.number() }).optional(),
    /** 0 = above the water, 1 = below; others dim to 35%. */
    focus: z.union([z.number().int().min(0).max(1), z.array(z.object({ index: z.number().int().min(0).max(1).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("pressuresShelter"), props: z.object({
    /** House + slab set on `houseAt`; each pressure (≤ 6, alternating left/right) arrives as a wind stroke on its cue. */
    houseAt: z.number(),
    pressures: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(6),
    /** Up to 4 values inked into the slab; slab glows and pressures recede on `foundationAt`. */
    values: z.array(z.object({ text: z.string(), at: z.number() })).max(4).optional(),
    foundationAt: z.number().optional(),
    caption: z.object({ text: z.string(), at: z.number() }).optional(),
    focus: z.union([z.number().int().min(0).max(5), z.array(z.object({ index: z.number().int().min(0).max(5).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("ecosystemRings"), props: z.object({
    /** Centre disc (cut on `at`); `label` = script word (e.g. "faith"), optional small `sub` above it. */
    centre: z.object({ label: z.string(), at: z.number(), labelAt: z.number().optional(), sub: z.string().optional(), subAt: z.number().optional() }),
    /** Rings inside→out, each swept round on `at` (its name); optional spoken examples shown in a right column. */
    rings: z.array(z.object({ label: z.string(), at: z.number(), notes: z.array(z.object({ text: z.string(), at: z.number() })).max(5).optional() })).min(1).max(5),
    focus: z.union([z.number().int().min(0).max(4), z.array(z.object({ index: z.number().int().min(0).max(4).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("balanceScale"), props: z.object({
    /** Two pans: heading sets on `at`; each item is a block dropped in on its cue; beam tips toward the heavier side. */
    left: z.object({ label: z.string(), at: z.number(), items: z.array(z.object({ text: z.string(), at: z.number() })).max(5) }),
    right: z.object({ label: z.string(), at: z.number(), items: z.array(z.object({ text: z.string(), at: z.number() })).max(5) }),
    beamAt: z.number().optional(),
    /** Lift one side's blocks away on a cue (weight removed). */
    release: z.object({ side: z.enum(["left", "right"]), at: z.number() }).optional(),
    /** Beam comes to rest level on this cue (e.g. "trust"). */
    levelAt: z.number().optional(),
    /** Script word under the stand (e.g. "amanah"). */
    pivot: z.object({ text: z.string(), at: z.number() }).optional(),
    focus: z.enum(["left", "right"]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("sortTrays"), props: z.object({
    /** 2–3 open paper trays; each header tab is cut on its `at` (e.g. "Islamic teaching", "Cultural expectation"). */
    trays: z.array(z.object({ label: z.string(), at: z.number() })).min(2).max(3),
    /** Example cards, each dropped into its tray (index) on its cue; ≤ 5 per tray, stacked bottom-up. */
    cards: z.array(z.object({ text: z.string(), tray: z.number().int().min(0).max(2), at: z.number() })).max(12),
    /** Script line under the trays (≤ 4 words). */
    caption: z.object({ text: z.string(), at: z.number() }).optional(),
    /** Tray index (static) or timed steps: other trays dim for revisits. */
    focus: z.union([z.number().int().min(0).max(2), z.array(z.object({ index: z.number().int().min(0).max(2).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("bridgePlanks"), props: z.object({
    /** Two cliffs (set on `cliffsAt`), optional short labels on their faces. */
    cliffsAt: z.number(),
    ends: z.object({ left: z.string(), right: z.string(), at: z.number() }).optional(),
    /** Up to 4 planks laid left→right, each on its spoken cue, label set beneath. */
    planks: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(4),
    /** Hand ropes ink across once the bridge is complete (e.g. on "work together"). */
    railsAt: z.number().optional(),
    /** Script word above the bridge (≤ 4 words). */
    caption: z.object({ text: z.string(), at: z.number() }).optional(),
    /** Plank index (static) or timed steps for revisits: other planks dim. */
    focus: z.union([z.number().int().min(0).max(3), z.array(z.object({ index: z.number().int().min(0).max(3).nullable(), at: z.number() }))]).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("mythTruth"), props: z.object({
    /** Script ordinal above the slip (e.g. "first"; no numerals, no capital I). */
    index: z.object({ text: z.string(), at: z.number() }).optional(),
    /** The myth: slip stamped MYTH slides up and the text is inked on `at`. */
    myth: z.object({ text: z.string(), at: z.number() }),
    /** The correcting phrase ("however …"): the slip tears and falls away, revealing the truth card. */
    tearAt: z.number(),
    /** Truth sentence (comes into focus on `at`); `label` = script word on the card (default "truth"). */
    truth: z.object({ text: z.string(), at: z.number(), label: z.string().optional() }),
    /** Up to 5 spoken words along the foot of the truth card, each on its cue. */
    notes: z.array(z.object({ text: z.string(), at: z.number() })).max(5).optional(),
    /** Tally of torn myths (cumulative): earlier myths' short labels; `short` = this myth's label, added after the tear. */
    past: z.array(z.string()).max(6).optional(),
    short: z.string().optional(),
  }) }),
  z.object({ ...Base, type: z.literal("scenarioCard"), props: z.object({
    /** Script ordinal ("first", "second", "third"); `topic` word set at the card's right. */
    ordinal: z.object({ text: z.string(), at: z.number() }),
    topic: z.object({ text: z.string(), at: z.number() }).optional(),
    /** Card slides up on this cue (default: 0.5 s before the ordinal). */
    cardAt: z.number().optional(),
    /** Up to 3 single-line situation phrases, each comes into focus on its ruled line. */
    situation: z.array(z.object({ text: z.string(), at: z.number() })).min(1).max(3),
    /** Unhealthy response: inked muted, struck through on `strikeAt` (default: once written). */
    avoid: z.object({ text: z.string(), at: z.number(), strikeAt: z.number().optional() }).optional(),
    /** Better response: up to 3 lines inked on the ruled area, each on its cue. */
    response: z.array(z.object({ text: z.string(), at: z.number() })).max(3).default([]),
    responseLabel: z.string().optional(),
    /** Script close (≤ 4 words), e.g. "maturity in action". */
    outcome: z.object({ text: z.string(), at: z.number() }).optional(),
    /** Earlier scenarios' topics, shown as tabs beside the card. */
    past: z.array(z.string()).max(4).optional(),
  }) }),
  z.object({ ...Base, type: z.literal("mirrorCheck"), props: z.object({
    /** Oval mirror is cut on `mirrorAt`; `title` script inked in the glass until the first question (returns on `doneAt`). */
    mirrorAt: z.number(),
    title: z.object({ text: z.string(), at: z.number() }).optional(),
    /** Up to 6 questions: full `text` in the glass on `at`; `short` (≤ 4 words) filed in the numbered stack once answered. */
    questions: z.array(z.object({ text: z.string(), short: z.string(), at: z.number(), notes: z.array(z.object({ text: z.string(), at: z.number() })).max(5).optional() })).max(6),
    /** Last question is filed and the title returns. */
    doneAt: z.number().optional(),
    focus: z.union([z.number().int().min(0).max(5), z.array(z.object({ index: z.number().int().min(0).max(5).nullable(), at: z.number() }))]).optional(),
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
