-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('youtube', 'cloudflare');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "provider" "VideoProvider",
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "streamId" DROP NOT NULL;
