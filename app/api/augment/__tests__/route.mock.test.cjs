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

test('POST /api/augment uses mock assistant when MODEL_API_KEY missing', async () => {
  const restoreFns = [];
  const register = (specifier, exports) => {
    restoreFns.push([specifier, exports]);
  };

  const originalModelKey = process.env.MODEL_API_KEY;
  delete process.env.MODEL_API_KEY;

  const envPath = require.resolve('@/lib/env');
  const originalEnvModule = require.cache[envPath];
  delete require.cache[envPath];
  const envModule = require(envPath);

  const moduleMocks = new Map();

  register('next/server', {
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
  });

  register('@/lib/env', envModule);

  register('@/lib/authz', {
    assertSameOrg: () => {},
    getSessionUser: async () => ({ id: 'user-1', orgId: 'org-1' })
  });

  register('@/lib/logger', {
    createRequestLogger: () => ({
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {}
      },
      requestId: 'req-aug-1'
    }),
    serializeError: (error) => ({ message: error instanceof Error ? error.message : String(error) })
  });

  register('@/lib/lesson/progress', {
    coerceSegments: () => []
  });

  register('@/lib/augment/prompt', {
    buildAugmentPrompt: () => ({
      system: 'System prompt',
      user: [
        'Lesson: Sample Lesson',
        'Objectives: Practice testing',
        'Progress: 30 sec watched of 60 sec total (50% complete); segments: 1 segment(s)',
        'Confusion cues: none detected.'
      ].join('\n')
    }),
    redactEmails: (value) => value
  });

  register('@/lib/augment/rate-limit', {
    checkAugmentQuota: async () => ({ ok: true, remaining: 2 })
  });

  const transactionClient = {
    augmentationServed: {
      async create() {
        return { id: 'served-1' };
      }
    },
    augmentationMessage: {
      async create() {
        return { id: 'message-1' };
      }
    }
  };

  register('@/lib/prisma', {
    prisma: {
      lesson: {
        async findUnique() {
          return {
            id: 'lesson-1',
            title: 'Sample Lesson',
            durationS: 120,
            module: { course: { orgId: 'org-1' } }
          };
        }
      },
      progress: {
        async findUnique() {
          return { uniqueSeconds: 30, segments: [] };
        }
      },
      lessonRuntimeSnapshot: {
        async findFirst() {
          return { runtimeJson: { objectives: 'Practice testing' } };
        }
      },
      async $transaction(callback) {
        return callback(transactionClient);
      }
    }
  });

  for (const [specifier, exports] of restoreFns) {
    moduleMocks.set(specifier, exports);
  }

  const routePath = path.join(__dirname, '../route.ts');
  const { POST } = transpileWithMocks(routePath, moduleMocks);

  const requestPayload = {
    lessonId: 'lesson-1',
    kind: 'probe'
  };

  const request = new Request('http://localhost/api/augment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  const response = await POST(request);
  const json = await response.json();

  assert.equal(json.ok, true, 'response should be successful');
  assert.equal(json.kind, 'probe');
  assert.equal(json.__mock, true, 'mock flag should be returned when MODEL_API_KEY is missing');
  assert.ok(typeof json.content === 'string' && json.content.length > 0, 'content should be present');
  assert.equal(json.requestId, 'req-aug-1');

  if (originalEnvModule) {
    require.cache[envPath] = originalEnvModule;
  } else {
    delete require.cache[envPath];
  }

  if (originalModelKey !== undefined) {
    process.env.MODEL_API_KEY = originalModelKey;
  } else {
    delete process.env.MODEL_API_KEY;
  }
});
