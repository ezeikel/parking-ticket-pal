-- CreateTable
CREATE TABLE "news_videos" (
    "id" TEXT NOT NULL,
    "articleUrl" TEXT NOT NULL,
    "articleUrlHash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "interestScore" DOUBLE PRECISION NOT NULL,
    "script" TEXT NOT NULL,
    "scriptSegments" JSONB,
    "sceneImagePrompts" JSONB,
    "voiceoverUrl" TEXT,
    "voiceoverDuration" DOUBLE PRECISION,
    "wordTimestamps" JSONB,
    "backgroundMusicUrl" TEXT,
    "transitionSfxUrl" TEXT,
    "newsSfxUrl" TEXT,
    "sceneImages" JSONB,
    "videoUrl" TEXT,
    "coverImageUrl" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "postingResults" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_videos_articleUrlHash_key" ON "news_videos"("articleUrlHash");

-- CreateIndex
CREATE INDEX "news_videos_articleUrlHash_idx" ON "news_videos"("articleUrlHash");

-- CreateIndex
CREATE INDEX "news_videos_status_idx" ON "news_videos"("status");

-- CreateIndex
CREATE INDEX "news_videos_createdAt_idx" ON "news_videos"("createdAt");
