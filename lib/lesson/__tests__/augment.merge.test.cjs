process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  paths: {
    '@/*': ['./*']
  }
});
require('ts-node/register');
require('tsconfig-paths/register');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ts = require('typescript');

const transpileWithMocks = (filePath, mocks = new Map()) => {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
  });

  const moduleExports = {};
  const moduleInfo = { exports: moduleExports };

  const sandboxRequire = (specifier) => {
    if (mocks.has(specifier)) {
      return mocks.get(specifier);
    }
    return require(specifier);
  };

  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${transpiled.outputText}\n})`;
  const script = new vm.Script(wrapped, { filename: filePath });
  const runner = script.runInThisContext();
  runner(moduleExports, sandboxRequire, moduleInfo, filePath, path.dirname(filePath));

  return moduleInfo.exports;
};

test('buildAugmentPrompt produces concise progress-aware prompt', () => {
  const { buildAugmentPrompt } = require('../../augment/prompt');

  const prompt = buildAugmentPrompt({
    lesson: { title: 'Intro to Algorithms', objectives: 'Understand recursion' },
    progress: {
      uniqueSeconds: 180,
      durationS: 600
    },
    transcriptSnippet: 'I am confused about how recursive calls unwind.',
    lastUserMsg: 'Can you help me trace this function?'
  });

  assert.equal(
    prompt.system,
    'You are POP Bot, a concise learning coach. Be supportive, specific, and brief. Ask at most one question.',
    'system prompt should match spec'
  );
  assert.ok(prompt.user && prompt.user.trim().length > 0, 'user prompt should be populated');
  assert.ok(prompt.user.includes('Lesson: Intro to Algorithms'), 'lesson title should be included');
  assert.ok(prompt.user.includes('Viewer progress: ~30%'), 'progress percent should be included');
  assert.ok(prompt.user.includes('Excerpt: I am confused about how recursive calls unwind.'), 'transcript snippet should be included');
  assert.ok(prompt.user.includes('Learner says: Can you help me trace this function?'), 'learner message should be included');
});

test('checkAugmentQuota blocks once three augmentations served within an hour', async () => {
  const counts = [0, 1, 2, 3];
  const rateLimitPath = path.join(__dirname, '../../augment/rate-limit.ts');

  const { checkAugmentQuota } = transpileWithMocks(
    rateLimitPath,
    new Map([
      [
        '@/lib/prisma',
        {
          prisma: {
            augmentationServed: {
              async count() {
                return counts.shift() ?? 3;
              }
            }
          }
        }
      ]
    ])
  );

  const first = await checkAugmentQuota('org-1', 'user-1', 'lesson-1');
  assert.deepEqual(first, { ok: true, remaining: 3 });

  const second = await checkAugmentQuota('org-1', 'user-1', 'lesson-1');
  assert.deepEqual(second, { ok: true, remaining: 2 });

  const third = await checkAugmentQuota('org-1', 'user-1', 'lesson-1');
  assert.deepEqual(third, { ok: true, remaining: 1 });

  const fourth = await checkAugmentQuota('org-1', 'user-1', 'lesson-1');
  assert.deepEqual(fourth, { ok: false, remaining: 0 });
});
