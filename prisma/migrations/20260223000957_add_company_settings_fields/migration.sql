-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "address" VARCHAR(500),
ADD COLUMN     "date_format" VARCHAR(10) NOT NULL DEFAULT 'mdy',
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
ADD COLUMN     "work_week_starts" VARCHAR(10) NOT NULL DEFAULT 'monday';
