-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "overtime" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "work_hours" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "user_agent" VARCHAR(500);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "bank_details" JSONB,
ADD COLUMN     "emergency_contact" JSONB,
ADD COLUMN     "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
ADD COLUMN     "salary" DECIMAL(12,2),
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");
