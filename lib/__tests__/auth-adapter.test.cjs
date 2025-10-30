require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
  },
});

const assert = require("node:assert/strict");
const { afterEach, beforeEach, describe, it, mock } = require("node:test");
const { UserRole } = require("@prisma/client");
const Module = require("module");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");

let buildAuthAdapter;
let originalModuleLoad;

describe("auth adapter", () => {
  let prismaMock;
  let baseCreateUser;

  beforeEach(async () => {
    baseCreateUser = mock.fn();

    const organizationFindFirst = mock.fn(async () => null);
    const organizationCreate = mock.fn(async () => ({
      id: "org_1",
      name: "POP Initiative",
    }));

    const userFindUnique = mock.fn(async () => null);
    const userCreate = mock.fn(async (args) => ({
      id: "user_1",
      ...args.data,
    }));
    const userUpdate = mock.fn();

    prismaMock = {
      organization: {
        findFirst: organizationFindFirst,
        create: organizationCreate,
      },
      user: {
        findUnique: userFindUnique,
        create: userCreate,
        update: userUpdate,
      },
    };

    originalModuleLoad = Module._load;
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "@auth/prisma-adapter") {
        return { PrismaAdapter: () => createBaseAdapterStub() };
      }
      if (request.startsWith("@/")) {
        const resolved = path.join(projectRoot, request.slice(2));
        return originalModuleLoad.call(this, resolved, parent, isMain);
      }
      return originalModuleLoad.apply(this, arguments);
    };

    ({ buildAuthAdapter } = require("../auth-adapter.ts"));
  });

  afterEach(() => {
    Module._load = originalModuleLoad;
  });

  function createBaseAdapterStub() {
    return {
      createUser: baseCreateUser,
      getUser: mock.fn(),
      getUserByEmail: mock.fn(),
      getUserByAccount: mock.fn(),
      updateUser: mock.fn(),
      deleteUser: mock.fn(),
      linkAccount: mock.fn(),
      unlinkAccount: mock.fn(),
      createSession: mock.fn(),
      getSessionAndUser: mock.fn(),
      updateSession: mock.fn(),
      deleteSession: mock.fn(),
      createVerificationToken: mock.fn(),
      useVerificationToken: mock.fn(),
    };
  }

  it("creates organization and user records for first-time Google sign-in", async () => {
    const adapter = buildAuthAdapter({
      prismaClient: prismaMock,
    });

    const created = await adapter.createUser({
      email: "learner@example.com",
      name: "Learner",
      image: "https://example.com/avatar.png",
      emailVerified: null,
    });

    assert.equal(baseCreateUser.mock.callCount(), 0);
    assert.equal(prismaMock.user.findUnique.mock.callCount(), 1);
    assert.equal(prismaMock.organization.findFirst.mock.callCount(), 1);
    assert.equal(prismaMock.organization.create.mock.callCount(), 1);
    assert.equal(prismaMock.user.create.mock.callCount(), 1);
    assert.equal(prismaMock.user.update.mock.callCount(), 0);

    const createCall = prismaMock.user.create.mock.calls[0].arguments[0];
    assert.deepEqual(createCall.data, {
      email: "learner@example.com",
      name: "Learner",
      image: "https://example.com/avatar.png",
      orgId: "org_1",
      role: UserRole.LEARNER,
    });

    assert.equal(created.orgId, "org_1");
    assert.equal(created.email, "learner@example.com");
    assert.equal(created.emailVerified, null);
  });
});
