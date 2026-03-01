-- DropForeignKey
ALTER TABLE "tribunal_case_videos" DROP CONSTRAINT IF EXISTS "tribunal_case_videos_keyCaseId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "tribunal_case_videos_keyCaseId_idx";

-- AlterTable: remove columns from tribunal_case_videos
ALTER TABLE "tribunal_case_videos" DROP COLUMN IF EXISTS "caseSource";
ALTER TABLE "tribunal_case_videos" DROP COLUMN IF EXISTS "keyCaseId";

-- DropTable
DROP TABLE IF EXISTS "council_pcn_data";
DROP TABLE IF EXISTS "key_case_precedents";
DROP TABLE IF EXISTS "national_appeal_stats";

-- DropEnum
DROP TYPE IF EXISTS "KeyCaseSource";
DROP TYPE IF EXISTS "NationalStatsSource";
DROP TYPE IF EXISTS "UKRegion";
DROP TYPE IF EXISTS "VideoCaseSource";
