-- AlterEnum
ALTER TYPE "CommentQueueStatus" ADD VALUE 'LIKED';

-- AlterTable
ALTER TABLE "social_comment_queue" ADD COLUMN     "isThreadReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentCommentId" TEXT,
ADD COLUMN     "parentCommentText" TEXT;
