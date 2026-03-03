-- AlterTable
ALTER TABLE "news_videos" ADD COLUMN     "blogPostSlug" TEXT;

-- AlterTable
ALTER TABLE "tribunal_case_videos" ADD COLUMN     "blogPostSlug" TEXT;

-- CreateTable
CREATE TABLE "instagram_post_blog_mappings" (
    "id" TEXT NOT NULL,
    "instagramMediaId" TEXT NOT NULL,
    "blogPostSlug" TEXT NOT NULL,
    "blogPostUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "videoRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_post_blog_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_post_blog_mappings_instagramMediaId_key" ON "instagram_post_blog_mappings"("instagramMediaId");

-- CreateIndex
CREATE INDEX "instagram_post_blog_mappings_instagramMediaId_idx" ON "instagram_post_blog_mappings"("instagramMediaId");
