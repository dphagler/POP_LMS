process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  paths: {
    '@/*': ['./*'],
    'next/server': ['app/api/augment/__tests__/__mocks__/next-server']
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

test('POST /api/augment returns mock payload when MODEL_API_KEY missing', async () => {
  const restoreEnv = process.env.MODEL_API_KEY;
  delete process.env.MODEL_API_KEY;

  const messagesPersisted = [];
  let servedRecord = null;

  const moduleMocks = new Map([
    [
      'next/server',
      {
        NextResponse: {
          json(payload, init) {
            const headers = new Headers(init?.headers ?? {});
            if (!headers.has('content-type')) {
              headers.set('content-type', 'application/json');
            }
            return new Response(JSON.stringify(payload), {
              status: init?.status ?? 200,
              headers
            });
          }
        }
      }
    ],
    [
      '@/lib/env',
      {
        env: {
          AUGMENT_ENABLE: 'true'
        }
      }
    ],
    [
      '@/lib/auth',
      {
        auth: async () => ({
          user: { id: 'user-1', orgId: 'org-1' }
        })
      }
    ],
    [
      '@/lib/augment/prompt',
      {
        buildAugmentPrompt: () => ({
          system: 'System prompt',
          user: 'User prompt'
        })
      }
    ],
    [
      '@/lib/augment/rate-limit',
      {
        checkAugmentQuota: async () => ({ ok: true, remaining: 2 })
      }
    ],
    [
      '@/lib/prisma',
      {
        prisma: {
          lesson: {
            async findUnique({ where }) {
              if (where.id !== 'lesson-1') return null;
              return { id: 'lesson-1', title: 'Sample Lesson', durationS: 120 };
            }
          },
          progress: {
            async findFirst() {
              return { uniqueSeconds: 45 };
            }
          },
          augmentationMessage: {
            async createMany({ data }) {
              messagesPersisted.push(...data);
            }
          },
          augmentationServed: {
            async create({ data }) {
              servedRecord = data;
              return { id: 'served-1' };
            }
          }
        }
      }
    ]
  ]);

  const routePath = path.join(__dirname, '../route.ts');
  const { POST } = transpileWithMocks(routePath, moduleMocks);

  const requestPayload = {
    lessonId: 'lesson-1',
    kind: 'probe',
    message: 'Hello!'
  };

  const request = new Request('http://localhost/api/augment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  const response = await POST(request);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.kind, 'probe');
  assert.equal(json.__mock, true);
  assert.ok(typeof json.content === 'string' && json.content.length > 0);

  assert.equal(messagesPersisted.length, 3, 'should persist system, user, and assistant messages');
  assert.equal(servedRecord.orgId, 'org-1');
  assert.equal(servedRecord.userId, 'user-1');
  assert.equal(servedRecord.lessonId, 'lesson-1');
  assert.equal(servedRecord.kind, 'probe');
  assert.equal(servedRecord.objectiveId, 'lesson-1:adhoc');
  assert.equal(servedRecord.assetRef, 'adhoc');
  assert.equal(servedRecord.ruleIndex, -1);
  assert.match(servedRecord.augmentationId, /^adhoc:/);

  if (restoreEnv !== undefined) {
    process.env.MODEL_API_KEY = restoreEnv;
  } else {
    delete process.env.MODEL_API_KEY;
  }
});
