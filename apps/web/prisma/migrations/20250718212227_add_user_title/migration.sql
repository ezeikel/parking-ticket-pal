-- CreateEnum
CREATE TYPE "UserTitle" AS ENUM ('MR', 'MRS', 'MS', 'DR', 'PROF', 'SIR', 'LADY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "title" "UserTitle";
