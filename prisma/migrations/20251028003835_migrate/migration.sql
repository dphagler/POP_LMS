-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "groupManager" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrgGroup" ADD COLUMN     "description" TEXT;
