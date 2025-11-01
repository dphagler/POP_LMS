require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node"
  }
});

const assert = require("node:assert/strict");
const { afterEach, beforeEach, describe, it, mock } = require("node:test");
const Module = require("module");

function waitForAsyncWork() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function waitForJobCompletion(jobStatuses, jobId) {
  for (let i = 0; i < 10; i += 1) {
    await waitForAsyncWork();
    const status = jobStatuses.get(jobId);
    if (status && status.phase === "done") {
      return status;
    }
  }
  return jobStatuses.get(jobId);
}

describe("runSanitySync", () => {
  let prismaStore;
  let prismaMock;
  let jobStatuses;
  let runSanitySync;
  let originalLoader;
  let originalCache;

  const moduleId = "sanity-module-1";
  const courseId = "sanity-course-1";

  function buildSanityCourse() {
    return {
      _id: "course-1",
      title: "Course",
      description: "Course description",
      modules: [
        {
          _id: "module-1",
          title: "Module",
          order: 0,
          lessons: [
            {
              _id: "lesson-1",
              title: "Lesson",
              provider: "youtube",
              videoUrl: "https://youtu.be/demo",
              durationS: 90
            }
          ]
        }
      ]
    };
  }

  beforeEach(() => {
    prismaStore = {
      courses: new Map([
        [
          courseId,
          {
            id: courseId,
            orgId: "org_1",
            title: "Legacy Course",
            description: "Outdated description"
          }
        ]
      ]),
      modules: new Map([
        [
          moduleId,
          { id: moduleId, courseId, title: "Legacy Module", order: 5 }
        ]
      ]),
      lessons: new Map(),
      snapshots: []
    };

    prismaMock = {
      course: {
        findUnique: mock.fn(async ({ where, select }) => {
          const record = prismaStore.courses.get(where.id);
          if (!record) return null;
          if (!select) return { ...record };
          const picked = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              picked[key] = record[key] ?? null;
            }
          }
          return picked;
        }),
        create: mock.fn(async ({ data }) => {
          prismaStore.courses.set(data.id, { ...data });
          return { ...data };
        }),
        update: mock.fn(async ({ where, data }) => {
          const next = { ...prismaStore.courses.get(where.id), ...data };
          prismaStore.courses.set(where.id, next);
          return { ...next };
        })
      },
      module: {
        findUnique: mock.fn(async ({ where, select }) => {
          const record = prismaStore.modules.get(where.id);
          if (!record) return null;
          if (!select) return { ...record };
          const picked = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              picked[key] = record[key] ?? null;
            }
          }
          return picked;
        }),
        create: mock.fn(async ({ data }) => {
          prismaStore.modules.set(data.id, { ...data });
          return { ...data };
        }),
        update: mock.fn(async ({ where, data }) => {
          const next = { ...prismaStore.modules.get(where.id), ...data };
          prismaStore.modules.set(where.id, next);
          return { ...next };
        })
      },
      lesson: {
        findUnique: mock.fn(async ({ where, select }) => {
          const record = prismaStore.lessons.get(where.id);
          if (!record) return null;
          if (!select) return { ...record };
          const picked = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              if (key in record) {
                picked[key] = record[key];
              } else {
                picked[key] = null;
              }
            }
          }
          return picked;
        }),
        create: mock.fn(async ({ data }) => {
          prismaStore.lessons.set(data.id, { ...data });
          return { ...data };
        }),
        update: mock.fn(async ({ where, data }) => {
          const next = { ...prismaStore.lessons.get(where.id), ...data };
          prismaStore.lessons.set(where.id, next);
          return { ...next };
        })
      },
      lessonRuntimeSnapshot: {
        findFirst: mock.fn(async ({ where }) => {
          const snapshots = prismaStore.snapshots
            .filter((snap) => snap.orgId === where.orgId && snap.lessonId === where.lessonId)
            .sort((a, b) => b.version - a.version);
          return snapshots[0] ?? null;
        }),
        create: mock.fn(async ({ data }) => {
          prismaStore.snapshots.push({ ...data });
          return { ...data };
        })
      }
    };

    jobStatuses = new Map();
    let jobCounter = 0;

    originalLoader = Module._load;
    originalCache = require.resolve("../../server-actions/sync.ts");
    delete require.cache[originalCache];

    Module._load = function patched(request, parent, isMain) {
      if (request === "@/lib/authz") {
        return {
          requireAdminAccess: async () => ({
            session: { user: { id: "admin_1", orgId: "org_1" } }
          })
        };
      }
      if (request === "@/lib/db/audit") {
        return {
          logAudit: async () => {}
        };
      }
      if (request === "@/lib/prisma") {
        return { prisma: prismaMock };
      }
      if (request === "@/lib/jobs/syncStatus") {
        return {
          appendSyncJobLog: mock.fn(() => {}),
          createSyncJob: mock.fn((orgId, options, message) => {
            const id = `job-${++jobCounter}`;
            const status = {
              id,
              orgId,
              counts: { created: 0, updated: 0, deleted: 0, skipped: 0 },
              options,
              message,
              phase: "queued"
            };
            jobStatuses.set(id, status);
            return status;
          }),
          getActiveSyncJobForOrg: mock.fn(() => null),
          getLatestSyncStatusForOrg: mock.fn(() => {
            if (jobCounter === 0) return null;
            return jobStatuses.get(`job-${jobCounter}`) ?? null;
          }),
          getSyncStatusForOrg: mock.fn(() => null),
          updateSyncJob: mock.fn((id, payload) => {
            const status = jobStatuses.get(id);
            if (!status) return null;
            if (payload.phase) {
              status.phase = payload.phase;
            }
            if (payload.message) {
              status.message = payload.message;
            }
            if (payload.counts) {
              status.counts = { ...payload.counts };
            }
            return status;
          })
        };
      }
      if (request === "@/lib/sanity") {
        return {
          getMissingSanityEnvVars: () => [],
          fetchPublishedCourses: async () => [buildSanityCourse()],
          fetchChangedSince: async () => [buildSanityCourse()]
        };
      }
      return originalLoader.apply(this, arguments);
    };

    mock.method(global, "setTimeout", (fn) => {
      fn();
      return 0;
    });

    runSanitySync = require("../../server-actions/sync.ts").runSanitySync;
  });

  afterEach(() => {
    Module._load = originalLoader;
    mock.reset();
    if (originalCache) {
      delete require.cache[originalCache];
    }
  });

  it("creates a new lesson only once and skips on subsequent runs", async () => {
    const first = await runSanitySync();
    assert.equal(first.ok, true);

    const firstStatus = await waitForJobCompletion(jobStatuses, first.jobId);
    assert.ok(firstStatus);
    assert.equal(firstStatus.counts.created, 1);

    const initialSkipped = firstStatus.counts.skipped;

    const second = await runSanitySync();
    assert.equal(second.ok, true);

    const secondStatus = await waitForJobCompletion(jobStatuses, second.jobId);
    assert.ok(secondStatus);
    assert.equal(secondStatus.counts.updated, 0);
    assert.ok(secondStatus.counts.skipped > initialSkipped);

    assert.equal(prismaMock.lesson.create.mock.callCount(), 1);
    assert.equal(prismaMock.lesson.update.mock.callCount(), 0);
    assert.equal(prismaMock.lessonRuntimeSnapshot.create.mock.callCount(), 1);
  });
});
