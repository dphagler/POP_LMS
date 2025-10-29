export interface LessonObjective {
  id: string;
  summary: string;
}

export interface AugmentationRule {
  targets: string[];
  whenExpr: string;
  assetRef: string;
}

export interface LessonRuntime {
  id: string;
  title: string;
  objectives: LessonObjective[];
  streamId: string | null;
  videoId: string | null;
  videoProvider: "youtube" | "cloudflare";
  posterUrl: string | null;
  durationSec: number;
  assessmentType: string;
  augmentations: AugmentationRule[];
}

export interface ProgressState {
  lessonId: string;
  watchedSeconds: number;
  uniqueSeconds: number;
  isComplete: boolean;
  thresholdPct: number;
}

export type DiagnosticLevel = 'MET' | 'PARTIAL' | 'NOT_MET';

export interface DiagnosticResult {
  objectiveId: string;
  level: DiagnosticLevel;
  score?: number;
}

export type LessonEvent =
  | 'VIDEO_ENDED'
  | 'QUIZ_SUBMITTED'
  | 'CHAT_SCORED'
  | 'DIAGNOSTIC_READY'
  | 'AUGMENT_DONE';
