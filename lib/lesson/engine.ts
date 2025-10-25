import type {
  DiagnosticResult,
  LessonEvent,
  LessonRuntime,
  ProgressState,
} from './contracts';

export type LessonEngineState =
  | 'VIEWING'
  | 'ASSESSING'
  | 'DIAGNOSING'
  | 'AUGMENTING'
  | 'COMPLETED';

export const INITIAL_STATE: LessonEngineState = 'VIEWING';

export interface LessonContext {
  runtime: Pick<LessonRuntime, 'durationSec' | 'augmentations'>;
  progress: Pick<ProgressState, 'uniqueSeconds' | 'thresholdPct'>;
  diagnostics?: DiagnosticResult[];
}

const ZERO = 0;

export const assessmentAllowed = ({
  runtime,
  progress,
}: LessonContext): boolean => {
  const duration = runtime.durationSec ?? ZERO;
  if (duration <= ZERO) {
    return false;
  }

  const watchedRatio = progress.uniqueSeconds / duration;
  return watchedRatio >= progress.thresholdPct;
};

export const needsAugmentation = ({
  runtime,
  diagnostics,
}: LessonContext): boolean => {
  if (!diagnostics || diagnostics.length === ZERO) {
    return false;
  }

  return diagnostics.some((result) => {
    if (result.level === 'MET') {
      return false;
    }

    return runtime.augmentations?.some((rule) =>
      rule.targets.includes(result.objectiveId),
    );
  });
};

export const transition = (
  state: LessonEngineState,
  event: LessonEvent,
  context: LessonContext,
): LessonEngineState => {
  switch (state) {
    case 'VIEWING':
      if (event === 'VIDEO_ENDED' && assessmentAllowed(context)) {
        return 'ASSESSING';
      }
      return state;
    case 'ASSESSING':
      if (event === 'QUIZ_SUBMITTED') {
        return 'DIAGNOSING';
      }
      return state;
    case 'DIAGNOSING':
      if (event === 'DIAGNOSTIC_READY' || event === 'CHAT_SCORED') {
        return needsAugmentation(context) ? 'AUGMENTING' : 'COMPLETED';
      }
      return state;
    case 'AUGMENTING':
      if (event === 'AUGMENT_DONE') {
        return 'COMPLETED';
      }
      return state;
    case 'COMPLETED':
    default:
      return 'COMPLETED';
  }
};

export const canStartAssessment = (
  state: LessonEngineState,
  context: LessonContext,
): boolean => state === 'VIEWING' && assessmentAllowed(context);

export const canDiagnose = (state: LessonEngineState): boolean =>
  state === 'ASSESSING';

export const canAugment = (
  state: LessonEngineState,
  context: LessonContext,
): boolean => state === 'DIAGNOSING' && needsAugmentation(context);

export const isDone = (state: LessonEngineState): boolean =>
  state === 'COMPLETED';
