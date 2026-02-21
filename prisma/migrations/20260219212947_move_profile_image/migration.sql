/*
  Warnings:

  - You are about to drop the column `profile_image` on the `employees` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "roles_name_key";

-- DropIndex
DROP INDEX "users_email_unique_active";

-- DropIndex
DROP INDEX "users_username_unique_active";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "profile_image";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image" TEXT;
