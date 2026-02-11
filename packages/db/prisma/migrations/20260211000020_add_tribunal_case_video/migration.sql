-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'SCRIPTING', 'VOICEOVER', 'RENDERING', 'POSTING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "tribunal_case_videos" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "interestScore" DOUBLE PRECISION NOT NULL,
    "script" TEXT NOT NULL,
    "scriptSegments" JSONB,
    "voiceoverUrl" TEXT,
    "voiceoverDuration" DOUBLE PRECISION,
    "wordTimestamps" JSONB,
    "backgroundMusicUrl" TEXT,
    "videoUrl" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "postingResults" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tribunal_case_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tribunal_case_videos_caseId_idx" ON "tribunal_case_videos"("caseId");

-- CreateIndex
CREATE INDEX "tribunal_case_videos_status_idx" ON "tribunal_case_videos"("status");

-- AddForeignKey
ALTER TABLE "tribunal_case_videos" ADD CONSTRAINT "tribunal_case_videos_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "london_tribunal_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
