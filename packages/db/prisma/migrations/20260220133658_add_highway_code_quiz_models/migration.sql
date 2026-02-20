-- CreateTable
CREATE TABLE "highway_code_signs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "govUkRef" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highway_code_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highway_code_quiz_posts" (
    "id" TEXT NOT NULL,
    "signId" TEXT NOT NULL,
    "questionSlideUrl" TEXT,
    "answerSlideUrl" TEXT,
    "caption" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "postingResults" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highway_code_quiz_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "highway_code_signs_used_idx" ON "highway_code_signs"("used");

-- CreateIndex
CREATE INDEX "highway_code_signs_category_idx" ON "highway_code_signs"("category");

-- CreateIndex
CREATE INDEX "highway_code_quiz_posts_signId_idx" ON "highway_code_quiz_posts"("signId");

-- CreateIndex
CREATE INDEX "highway_code_quiz_posts_status_idx" ON "highway_code_quiz_posts"("status");

-- AddForeignKey
ALTER TABLE "highway_code_quiz_posts" ADD CONSTRAINT "highway_code_quiz_posts_signId_fkey" FOREIGN KEY ("signId") REFERENCES "highway_code_signs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
