-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "shift_id" VARCHAR(36);

-- CreateTable
CREATE TABLE "shifts" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "work_days" VARCHAR(20) NOT NULL,
    "grace_period_mins" SMALLINT NOT NULL DEFAULT 0,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_holidays_date_idx" ON "public_holidays"("date");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_holidays" ADD CONSTRAINT "public_holidays_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
