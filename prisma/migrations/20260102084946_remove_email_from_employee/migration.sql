/*
  Warnings:

  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "employees_email_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "email";
