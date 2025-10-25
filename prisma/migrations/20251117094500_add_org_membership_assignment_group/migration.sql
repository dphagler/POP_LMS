-- CreateEnum
CREATE TYPE "OrgMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'INSTRUCTOR', 'LEARNER');

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgMembershipRole" NOT NULL DEFAULT 'LEARNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentGroup" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_userId_orgId_key" ON "OrgMembership"("userId", "orgId");

-- CreateIndex
CREATE INDEX "OrgMembership_userId_idx" ON "OrgMembership"("userId");

-- CreateIndex
CREATE INDEX "OrgMembership_orgId_idx" ON "OrgMembership"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentGroup_assignmentId_groupId_key" ON "AssignmentGroup"("assignmentId", "groupId");

-- CreateIndex
CREATE INDEX "AssignmentGroup_assignmentId_idx" ON "AssignmentGroup"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentGroup_groupId_idx" ON "AssignmentGroup"("groupId");

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentGroup" ADD CONSTRAINT "AssignmentGroup_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentGroup" ADD CONSTRAINT "AssignmentGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill membership rows for existing users
INSERT INTO "OrgMembership" ("id", "userId", "orgId", "role", "createdAt")
SELECT
    'om_' || md5(random()::text || clock_timestamp()::text) AS id,
    u."id" AS "userId",
    u."orgId" AS "orgId",
    CASE u."role"
        WHEN 'ADMIN'::"UserRole" THEN 'ADMIN'::"OrgMembershipRole"
        WHEN 'INSTRUCTOR'::"UserRole" THEN 'INSTRUCTOR'::"OrgMembershipRole"
        ELSE 'LEARNER'::"OrgMembershipRole"
    END AS role,
    u."createdAt" AS "createdAt"
FROM "User" u
ON CONFLICT ("userId", "orgId") DO NOTHING;
