import React from "react";
import type { Scene } from "../schema/manifest";
import { SectionTitle } from "../components/SectionTitle";
import { KineticStatement } from "../components/KineticStatement";
import { QuietReflection } from "../components/QuietReflection";
import { StepsDiagram } from "../components/StepsDiagram";
import { ConnectionMetaphor } from "../components/ConnectionMetaphor";
import { Comparison } from "../components/Comparison";
import { Takeaway } from "../components/Takeaway";
import { CourseIntro } from "../components/brand/CourseIntro";
import { StatementCollision } from "../components/brand/StatementCollision";
import { IntroductionPath } from "../components/brand/IntroductionPath";
import { ReflectionField } from "../components/brand/ReflectionField";
import { SummaryLedger } from "../components/brand/SummaryLedger";
import { ParallelPhrases } from "../components/brand/ParallelPhrases";
import { PathLandscape } from "../components/brand/PathLandscape";
import { ConvergingPaths } from "../components/brand/ConvergingPaths";
import { FindingBecoming } from "../components/brand/FindingBecoming";
import { ThreePillars } from "../components/brand/ThreePillars";
import { FoundationLayers } from "../components/brand/FoundationLayers";
import { EcosystemRings } from "../components/brand/EcosystemRings";
import { BalanceScale } from "../components/brand/BalanceScale";
import { Iceberg } from "../components/brand/Iceberg";
import { PressuresShelter } from "../components/brand/PressuresShelter";
import { HighlightLine } from "../components/brand/HighlightLine";
import { PullQuote } from "../components/brand/PullQuote";
import { QuestionPrompt } from "../components/brand/QuestionPrompt";
import { WordStack } from "../components/brand/WordStack";
import { MythTruth } from "../components/brand/MythTruth";
import { ScenarioCard } from "../components/brand/ScenarioCard";
import { MirrorCheck } from "../components/brand/MirrorCheck";
import { SortTrays } from "../components/brand/SortTrays";
import { BridgePlanks } from "../components/brand/BridgePlanks";
import { LessonMap } from "../components/brand/LessonMap";
import { ChapterRecap } from "../components/brand/ChapterRecap";

/** Maps a manifest scene "type" to its motion-library component. */
export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "sectionTitle": return <SectionTitle scene={scene} />;
    case "kineticStatement": return <KineticStatement scene={scene} />;
    case "quietReflection": return <QuietReflection scene={scene} />;
    case "stepsDiagram": return <StepsDiagram scene={scene} />;
    case "connectionMetaphor": return <ConnectionMetaphor scene={scene} />;
    case "comparison": return <Comparison scene={scene} />;
    case "takeaway": return <Takeaway scene={scene} />;
    case "courseIntro": return <CourseIntro scene={scene} />;
    case "statementCollision": return <StatementCollision scene={scene} />;
    case "introductionPath": return <IntroductionPath scene={scene} />;
    case "reflectionField": return <ReflectionField scene={scene} />;
    case "summaryLedger": return <SummaryLedger scene={scene} />;
    case "parallelPhrases": return <ParallelPhrases scene={scene} />;
    case "pathLandscape": return <PathLandscape scene={scene} />;
    case "convergingPaths": return <ConvergingPaths scene={scene} />;
    case "findingBecoming": return <FindingBecoming scene={scene} />;
    case "threePillars": return <ThreePillars scene={scene} />;
    case "foundationLayers": return <FoundationLayers scene={scene} />;
    case "ecosystemRings": return <EcosystemRings scene={scene} />;
    case "balanceScale": return <BalanceScale scene={scene} />;
    case "iceberg": return <Iceberg scene={scene} />;
    case "pressuresShelter": return <PressuresShelter scene={scene} />;
    case "highlightLine": return <HighlightLine scene={scene} />;
    case "pullQuote": return <PullQuote scene={scene} />;
    case "questionPrompt": return <QuestionPrompt scene={scene} />;
    case "wordStack": return <WordStack scene={scene} />;
    case "mythTruth": return <MythTruth scene={scene} />;
    case "scenarioCard": return <ScenarioCard scene={scene} />;
    case "mirrorCheck": return <MirrorCheck scene={scene} />;
    case "sortTrays": return <SortTrays scene={scene} />;
    case "bridgePlanks": return <BridgePlanks scene={scene} />;
    case "lessonMap": return <LessonMap scene={scene} />;
    case "chapterRecap": return <ChapterRecap scene={scene} />;
  }
};

/** The ground (background) colour each scene paints, so the backdrop between scenes can match it. */
export const groundOf = (scene: Scene, palette: Record<string, string>, fallback: string): string => {
  switch (scene.type) {
    case "courseIntro": case "summaryLedger": case "pathLandscape": return palette.royal ?? fallback;
    case "questionPrompt": return scene.props.ground === "royal" ? palette.royal ?? fallback : fallback;
    case "reflectionField": return (scene.props.ground === "royal" ? palette.royal : palette.oxblood) ?? fallback;
    default: return fallback;
  }
};
