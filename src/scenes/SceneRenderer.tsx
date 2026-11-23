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
  }
};

/** The ground (background) colour each scene paints, so the backdrop between scenes can match it. */
export const groundOf = (scene: Scene, palette: Record<string, string>, fallback: string): string => {
  switch (scene.type) {
    case "courseIntro": case "summaryLedger": case "pathLandscape": return palette.royal ?? fallback;
    case "reflectionField": return (scene.props.ground === "royal" ? palette.royal : palette.oxblood) ?? fallback;
    default: return fallback;
  }
};
