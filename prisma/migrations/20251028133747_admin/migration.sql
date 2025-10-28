/*
  Warnings:

  - You are about to drop the column `actorRole` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entity` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AuditLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."AuditLog_entity_entityId_idx";

-- DropIndex
DROP INDEX "public"."AuditLog_orgId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actorRole",
DROP COLUMN "entity",
DROP COLUMN "entityId",
DROP COLUMN "meta",
DROP COLUMN "updatedAt",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "targetId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");
