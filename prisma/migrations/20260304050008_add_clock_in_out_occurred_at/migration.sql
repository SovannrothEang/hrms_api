-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "check_in_occurred_at" TIMESTAMPTZ,
ADD COLUMN     "check_out_occurred_at" TIMESTAMPTZ,
ADD COLUMN     "client_timezone" VARCHAR(50);
