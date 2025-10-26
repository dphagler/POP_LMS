require('ts-node/register');

const assert = require('node:assert/strict');
const test = require('node:test');

const { planAugmentations } = require('../diagnostics');

const lessonObjectives = [
  { id: 'obj-1', summary: 'Understand fractions' },
  { id: 'obj-2', summary: 'Convert decimals' },
  { id: 'obj-3', summary: 'Estimate values' },
];

test('planAugmentations matches rules in order', () => {
  const diagnostics = [
    { objectiveId: 'obj-1', level: 'PARTIAL', score: 0.6 },
    { objectiveId: 'obj-2', level: 'MET', score: 0.92 },
  ];

  const rules = [
    {
      targets: ['obj-1', 'obj-2'],
      whenExpr: "level<'MET'",
      assetRef: 'sanity.asset:remediate-fractions',
    },
    {
      targets: ['obj-1'],
      whenExpr: 'score<0.5',
      assetRef: 'sanity.asset:extra-drill',
    },
  ];

  const plan = planAugmentations({
    objectives: lessonObjectives,
    diagnostics,
    rules,
  });

  assert.equal(plan.augmentations.length, 1);
  assert.deepEqual(plan.augmentations[0], {
    objective: lessonObjectives[0],
    assetRef: 'sanity.asset:remediate-fractions',
    ruleIndex: 0,
    diagnostic: diagnostics[0],
  });

  assert.ok(plan.trace.some((entry) => entry.includes('rule[0] target[obj-1]: fired')));
  assert.ok(plan.trace.some((entry) => entry.includes('rule[0] target[obj-2]: skipped')));
  assert.ok(plan.trace.some((entry) => entry.includes('rule[1] target[obj-1]: skipped')));
});

test('planAugmentations evaluates combined expressions', () => {
  const diagnostics = [
    { objectiveId: 'obj-3', level: 'NOT_MET', score: 0.41 },
  ];

  const rules = [
    {
      targets: ['obj-3'],
      whenExpr: "level<'PARTIAL' && score<0.5",
      assetRef: 'asset:estimation-remediation',
    },
  ];

  const plan = planAugmentations({
    objectives: lessonObjectives,
    diagnostics,
    rules,
  });

  assert.equal(plan.augmentations.length, 1);
  assert.equal(plan.augmentations[0].objective.id, 'obj-3');
  assert.equal(plan.augmentations[0].assetRef, 'asset:estimation-remediation');
});

test('planAugmentations skips when diagnostics missing or invalid', () => {
  const diagnostics = [
    { objectiveId: 'obj-2', level: 'MET', score: 0.98 },
  ];

  const rules = [
    {
      targets: ['obj-1', 'obj-missing'],
      whenExpr: "level<'MET'",
      assetRef: 'asset:any',
    },
  ];

  const plan = planAugmentations({
    objectives: lessonObjectives,
    diagnostics,
    rules,
  });

  assert.equal(plan.augmentations.length, 0);
  assert.ok(
    plan.trace.some((entry) =>
      entry.includes('rule[0] target[obj-missing]: skipped - objective not found'),
    ),
  );
});
