require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');

const engine = require('../engine.js');
const { computeUniqueSeconds } = require('../progress');

const buildHarness = () => {
  const runtime = {
    durationSec: 100,
    augmentations: [
      {
        targets: ['objective-1'],
        whenExpr: "level<'MET'",
        assetRef: 'sanity.asset:remediate-objective-1',
      },
    ],
  };

  const progress = {
    thresholdPct: 0.95,
    segments: [],
    uniqueSeconds: 0,
  };

  let diagnostics;

  const updateProgress = () => {
    progress.uniqueSeconds = computeUniqueSeconds(progress.segments, runtime.durationSec);
  };

  return {
    addSegment(segment) {
      progress.segments.push(segment);
      updateProgress();
    },
    setDiagnostics(nextDiagnostics) {
      diagnostics = nextDiagnostics;
    },
    getContext() {
      return {
        runtime,
        progress: {
          uniqueSeconds: progress.uniqueSeconds,
          thresholdPct: progress.thresholdPct,
        },
        diagnostics,
      };
    },
  };
};

test('lesson engine transitions from viewing to completion with augmentation', () => {
  const harness = buildHarness();
  let state = engine.INITIAL_STATE;

  assert.equal(state, 'VIEWING');
  assert.equal(engine.canStartAssessment(state, harness.getContext()), false);

  harness.addSegment([0, 30]);
  harness.addSegment([25, 60]);
  harness.addSegment([58, 97]);

  assert.equal(engine.canStartAssessment(state, harness.getContext()), true);

  state = engine.transition(state, 'VIDEO_ENDED', harness.getContext());
  assert.equal(state, 'ASSESSING');

  const quizEvent = {
    type: 'QUIZ_SUBMITTED',
    payload: {
      diagnostic: [
        {
          objectiveId: 'objective-1',
          level: 'NOT_MET',
          score: 0.35,
        },
      ],
    },
  };

  state = engine.transition(state, quizEvent.type, harness.getContext());
  assert.equal(state, 'DIAGNOSING');

  harness.setDiagnostics(quizEvent.payload.diagnostic);

  state = engine.transition(state, 'DIAGNOSTIC_READY', harness.getContext());
  assert.equal(state, 'AUGMENTING');

  state = engine.transition(state, 'AUGMENT_DONE', harness.getContext());
  assert.equal(state, 'COMPLETED');
  assert.equal(engine.isDone(state), true);
});
