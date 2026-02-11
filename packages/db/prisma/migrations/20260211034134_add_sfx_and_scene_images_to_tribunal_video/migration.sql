-- AlterTable
ALTER TABLE "tribunal_case_videos" ADD COLUMN     "sceneImages" JSONB,
ADD COLUMN     "transitionSfxUrl" TEXT,
ADD COLUMN     "verdictSfxUrl" TEXT;
