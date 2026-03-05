-- ==========================================================
-- HRMS API - COMPLETE DATABASE SETUP SCRIPT
-- Generated: 2026-03-05
-- This script contains the full schema and initial seed data.
-- ==========================================================

-- ----------------------------------------------------------
-- 1. SCHEMA DEFINITION
-- ----------------------------------------------------------

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "username" VARCHAR(25) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "resetToken" VARCHAR(36),
    "resetTokenExpiry" TIMESTAMPTZ,
    "failedAttempts" SMALLINT NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockUntil" TIMESTAMPTZ,
    "profile_image" TEXT,
    "fcm_token" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" VARCHAR(36) NOT NULL,
    "role_id" VARCHAR(36) NOT NULL,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "perform_by" VARCHAR(36),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" VARCHAR(36) NOT NULL,
    "department_name" VARCHAR(150) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_positions" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "salary_range_min" DECIMAL(10,2) NOT NULL,
    "salary_range_max" DECIMAL(10,2) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employee_positions_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "employees" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "department_id" VARCHAR(36) NOT NULL,
    "position_id" VARCHAR(36) NOT NULL,
    "manager_id" VARCHAR(36),
    "shift_id" VARCHAR(36),
    "employee_code" VARCHAR(15) NOT NULL,
    "hire_date" DATE NOT NULL,
    "firstname" VARCHAR(70) NOT NULL,
    "lastname" VARCHAR(70) NOT NULL,
    "gender" SMALLINT NOT NULL,
    "dob" DATE NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(20),
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "salary" DECIMAL(12,2),
    "emergency_contact" JSONB,
    "bank_details" JSONB,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "check_in_time" TIME,
    "check_out_time" TIME,
    "check_in_occurred_at" TIMESTAMPTZ,
    "check_out_occurred_at" TIMESTAMPTZ,
    "client_timezone" VARCHAR(50),
    "work_hours" DECIMAL(5,2),
    "overtime" DECIMAL(5,2) DEFAULT 0,
    "notes" TEXT,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "approved_by" VARCHAR(36),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "leave_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "request_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "leave_type" VARCHAR(50) NOT NULL,
    "year" SMALLINT NOT NULL,
    "total_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pending_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "country" VARCHAR(15) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" VARCHAR(36) NOT NULL,
    "from_currency_code" VARCHAR(5) NOT NULL,
    "to_currency_code" VARCHAR(5) NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "date" DATE NOT NULL,
    "source" VARCHAR(100),
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "currency_code" VARCHAR(5) NOT NULL,
    "base_currency_code" VARCHAR(5),
    "pay_period_start" DATE NOT NULL,
    "pay_period_end" DATE NOT NULL,
    "payment_date" DATE,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "overtime_hours" DECIMAL(4,2) NOT NULL,
    "overtime_rate" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "exchange_rate" DECIMAL(10,6),
    "base_currency_amount" DECIMAL(12,2),
    "status" VARCHAR(20) NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" VARCHAR(36) NOT NULL,
    "payroll_id" VARCHAR(36) NOT NULL,
    "currency_code" VARCHAR(5),
    "item_type" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" VARCHAR(36) NOT NULL,
    "currency_code" VARCHAR(5) NOT NULL,
    "country_code" VARCHAR(5) NOT NULL,
    "tax_year" SMALLINT NOT NULL,
    "bracket_name" VARCHAR(100) NOT NULL,
    "min_amount" DECIMAL(12,2) NOT NULL,
    "max_amount" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "fixed_amount" DECIMAL(12,2) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_tax_configs" (
    "id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "tax_country" VARCHAR(5) NOT NULL,
    "tax_code" VARCHAR(50) NOT NULL,
    "tax_exempt" BOOLEAN NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employee_tax_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_calculations" (
    "id" VARCHAR(36) NOT NULL,
    "payroll_id" VARCHAR(36) NOT NULL,
    "employee_id" VARCHAR(36) NOT NULL,
    "tax_bracket_id" VARCHAR(36) NOT NULL,
    "tax_period_start" DATE NOT NULL,
    "tax_period_end" DATE NOT NULL,
    "gross_income" DECIMAL(12,2) NOT NULL,
    "taxable_income" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "tax_rate_used" DECIMAL(5,4) NOT NULL,
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "action" VARCHAR(100) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" VARCHAR(150) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" VARCHAR(500),
    "base_currency_code" VARCHAR(5) NOT NULL,
    "fiscal_year_start_month" SMALLINT NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "date_format" VARCHAR(10) NOT NULL DEFAULT 'mdy',
    "work_week_starts" VARCHAR(10) NOT NULL DEFAULT 'monday',
    "perform_by" VARCHAR(36),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slugs" (
    "id" VARCHAR(36) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "status" VARCHAR(5) NOT NULL,
    "created_by" VARCHAR(36) NOT NULL,
    "updated_by" VARCHAR(36) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "slugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_id_idx" ON "users"("id");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_is_deleted_is_active_idx" ON "users"("is_deleted", "is_active");
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");
CREATE INDEX "roles_id_idx" ON "roles"("id");
CREATE INDEX "roles_name_idx" ON "roles"("name");
CREATE INDEX "roles_is_deleted_is_active_idx" ON "roles"("is_deleted", "is_active");
CREATE INDEX "departments_department_name_idx" ON "departments"("department_name");
CREATE INDEX "departments_is_active_is_deleted_idx" ON "departments"("is_active", "is_deleted");
CREATE INDEX "departments_created_at_idx" ON "departments"("created_at");
CREATE INDEX "departments_updated_at_idx" ON "departments"("updated_at");
CREATE INDEX "employee_positions_title_idx" ON "employee_positions"("title");
CREATE INDEX "employee_positions_is_active_is_deleted_idx" ON "employee_positions"("is_active", "is_deleted");
CREATE INDEX "employee_positions_created_at_idx" ON "employee_positions"("created_at");
CREATE INDEX "employee_positions_updated_at_idx" ON "employee_positions"("updated_at");
CREATE INDEX "shifts_name_idx" ON "shifts"("name");
CREATE INDEX "shifts_is_active_is_deleted_idx" ON "shifts"("is_active", "is_deleted");
CREATE INDEX "shifts_created_at_idx" ON "shifts"("created_at");
CREATE INDEX "shifts_updated_at_idx" ON "shifts"("updated_at");
CREATE INDEX "public_holidays_date_idx" ON "public_holidays"("date");
CREATE INDEX "public_holidays_is_active_is_deleted_idx" ON "public_holidays"("is_active", "is_deleted");
CREATE INDEX "public_holidays_created_at_idx" ON "public_holidays"("created_at");
CREATE INDEX "public_holidays_updated_at_idx" ON "public_holidays"("updated_at");
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");
CREATE INDEX "employees_position_id_idx" ON "employees"("position_id");
CREATE INDEX "employees_manager_id_idx" ON "employees"("manager_id");
CREATE INDEX "employees_shift_id_idx" ON "employees"("shift_id");
CREATE INDEX "employees_lastname_idx" ON "employees"("lastname");
CREATE INDEX "employees_employee_code_idx" ON "employees"("employee_code");
CREATE INDEX "employees_is_active_is_deleted_idx" ON "employees"("is_active", "is_deleted");
CREATE INDEX "employees_created_at_idx" ON "employees"("created_at");
CREATE INDEX "employees_updated_at_idx" ON "employees"("updated_at");
CREATE INDEX "attendances_employee_id_idx" ON "attendances"("employee_id");
CREATE INDEX "attendances_date_idx" ON "attendances"("date");
CREATE INDEX "attendances_employee_id_date_idx" ON "attendances"("employee_id", "date");
CREATE INDEX "attendances_status_idx" ON "attendances"("status");
CREATE INDEX "attendances_is_active_is_deleted_idx" ON "attendances"("is_active", "is_deleted");
CREATE INDEX "attendances_created_at_idx" ON "attendances"("created_at");
CREATE INDEX "attendances_updated_at_idx" ON "attendances"("updated_at");
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");
CREATE INDEX "leave_requests_approved_by_idx" ON "leave_requests"("approved_by");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");
CREATE INDEX "leave_requests_is_active_is_deleted_idx" ON "leave_requests"("is_active", "is_deleted");
CREATE INDEX "leave_requests_created_at_idx" ON "leave_requests"("created_at");
CREATE INDEX "leave_requests_updated_at_idx" ON "leave_requests"("updated_at");
CREATE INDEX "leave_balances_employee_id_idx" ON "leave_balances"("employee_id");
CREATE INDEX "leave_balances_leave_type_idx" ON "leave_balances"("leave_type");
CREATE INDEX "leave_balances_year_idx" ON "leave_balances"("year");
CREATE INDEX "leave_balances_is_active_is_deleted_idx" ON "leave_balances"("is_active", "is_deleted");
CREATE INDEX "leave_balances_created_at_idx" ON "leave_balances"("created_at");
CREATE INDEX "leave_balances_updated_at_idx" ON "leave_balances"("updated_at");
CREATE UNIQUE INDEX "leave_balances_employee_id_leave_type_year_key" ON "leave_balances"("employee_id", "leave_type", "year");
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");
CREATE INDEX "currencies_code_idx" ON "currencies"("code");
CREATE INDEX "currencies_is_active_is_deleted_idx" ON "currencies"("is_active", "is_deleted");
CREATE INDEX "currencies_created_at_idx" ON "currencies"("created_at");
CREATE INDEX "currencies_updated_at_idx" ON "currencies"("updated_at");
CREATE INDEX "exchange_rates_from_currency_code_to_currency_code_date_idx" ON "exchange_rates"("from_currency_code", "to_currency_code", "date");
CREATE INDEX "exchange_rates_is_active_is_deleted_idx" ON "exchange_rates"("is_active", "is_deleted");
CREATE INDEX "exchange_rates_created_at_idx" ON "exchange_rates"("created_at");
CREATE INDEX "exchange_rates_updated_at_idx" ON "exchange_rates"("updated_at");
CREATE INDEX "payrolls_employee_id_idx" ON "payrolls"("employee_id");
CREATE INDEX "payrolls_pay_period_start_pay_period_end_idx" ON "payrolls"("pay_period_start", "pay_period_end");
CREATE INDEX "payrolls_status_idx" ON "payrolls"("status");
CREATE INDEX "payrolls_currency_code_idx" ON "payrolls"("currency_code");
CREATE INDEX "payrolls_is_active_is_deleted_idx" ON "payrolls"("is_active", "is_deleted");
CREATE INDEX "payrolls_created_at_idx" ON "payrolls"("created_at");
CREATE INDEX "payrolls_updated_at_idx" ON "payrolls"("updated_at");
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");
CREATE INDEX "payroll_items_is_active_is_deleted_idx" ON "payroll_items"("is_active", "is_deleted");
CREATE INDEX "payroll_items_created_at_idx" ON "payroll_items"("created_at");
CREATE INDEX "payroll_items_updated_at_idx" ON "payroll_items"("updated_at");
CREATE INDEX "tax_brackets_country_code_tax_year_idx" ON "tax_brackets"("country_code", "tax_year");
CREATE INDEX "tax_brackets_currency_code_idx" ON "tax_brackets"("currency_code");
CREATE INDEX "tax_brackets_tax_year_idx" ON "tax_brackets"("tax_year");
CREATE INDEX "tax_brackets_is_active_is_deleted_idx" ON "tax_brackets"("is_active", "is_deleted");
CREATE INDEX "tax_brackets_created_at_idx" ON "tax_brackets"("created_at");
CREATE INDEX "tax_brackets_updated_at_idx" ON "tax_brackets"("updated_at");
CREATE UNIQUE INDEX "employee_tax_configs_employee_id_key" ON "employee_tax_configs"("employee_id");
CREATE INDEX "employee_tax_configs_is_active_is_deleted_idx" ON "employee_tax_configs"("is_active", "is_deleted");
CREATE INDEX "employee_tax_configs_created_at_idx" ON "employee_tax_configs"("created_at");
CREATE INDEX "employee_tax_configs_updated_at_idx" ON "employee_tax_configs"("updated_at");
CREATE UNIQUE INDEX "tax_calculations_payroll_id_key" ON "tax_calculations"("payroll_id");
CREATE INDEX "tax_calculations_employee_id_idx" ON "tax_calculations"("employee_id");
CREATE INDEX "tax_calculations_tax_bracket_id_idx" ON "tax_calculations"("tax_bracket_id");
CREATE INDEX "tax_calculations_tax_period_start_tax_period_end_idx" ON "tax_calculations"("tax_period_start", "tax_period_end");
CREATE INDEX "tax_calculations_is_active_is_deleted_idx" ON "tax_calculations"("is_active", "is_deleted");
CREATE INDEX "tax_calculations_created_at_idx" ON "tax_calculations"("created_at");
CREATE INDEX "tax_calculations_updated_at_idx" ON "tax_calculations"("updated_at");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");
CREATE INDEX "company_settings_is_active_is_deleted_idx" ON "company_settings"("is_active", "is_deleted");
CREATE INDEX "company_settings_created_at_idx" ON "company_settings"("created_at");
CREATE INDEX "company_settings_updated_at_idx" ON "company_settings"("updated_at");
CREATE UNIQUE INDEX "slugs_slug_key" ON "slugs"("slug");
CREATE INDEX "slugs_status_idx" ON "slugs"("status");
CREATE INDEX "slugs_is_active_is_deleted_idx" ON "slugs"("is_active", "is_deleted");
CREATE INDEX "slugs_created_at_idx" ON "slugs"("created_at");
CREATE INDEX "slugs_updated_at_idx" ON "slugs"("updated_at");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_positions" ADD CONSTRAINT "employee_positions_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public_holidays" ADD CONSTRAINT "public_holidays_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "employee_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_code_fkey" FOREIGN KEY ("from_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_code_fkey" FOREIGN KEY ("to_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_base_currency_code_fkey" FOREIGN KEY ("base_currency_code") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_tax_configs" ADD CONSTRAINT "employee_tax_configs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_tax_configs" ADD CONSTRAINT "employee_tax_configs_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_tax_bracket_id_fkey" FOREIGN KEY ("tax_bracket_id") REFERENCES "tax_brackets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_base_currency_code_fkey" FOREIGN KEY ("base_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "slugs" ADD CONSTRAINT "slugs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "slugs" ADD CONSTRAINT "slugs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ----------------------------------------------------------
-- 2. INITIAL SEED DATA
-- ----------------------------------------------------------

-- 2.1 Core Roles
INSERT INTO "roles" ("id", "name", "updated_at") VALUES
('ad000000-0000-0000-0000-000000000000', 'ADMIN', NOW()),
('ee000000-0000-0000-0000-000000000000', 'EMPLOYEE', NOW()),
('hr000000-0000-0000-0000-000000000000', 'HR_MANAGER', NOW()),
('aa000000-0000-0000-0000-000000000000', 'HRMS_API', NOW());

-- 2.2 Default Admin User (Password: Admin123!)
-- Hashed password for 'Admin123!' with 12 rounds
INSERT INTO "users" ("id", "username", "email", "password", "is_active", "updated_at") VALUES
('ad111111-1111-1111-1111-111111111111', 'admin', 'admin@example.com', '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNo3uK75hI178m5vJ34P8tLRE7S', true, NOW());

-- Assign Admin Role to Admin User
INSERT INTO "user_roles" ("user_id", "role_id", "assignedAt") VALUES
('ad111111-1111-1111-1111-111111111111', 'ad000000-0000-0000-0000-000000000000', NOW());

-- 2.3 Currencies
INSERT INTO "currencies" ("id", "code", "name", "symbol", "country", "updated_at") VALUES
('c0000000-0000-0000-0000-000000000001', 'USD', 'US Dollar', '$', 'USA', NOW()),
('c0000000-0000-0000-0000-000000000002', 'EUR', 'Euro', '€', 'EU', NOW()),
('c0000000-0000-0000-0000-000000000003', 'GBP', 'British Pound', '£', 'UK', NOW());

-- 2.4 Company Settings
INSERT INTO "company_settings" ("id", "name", "email", "phone", "address", "base_currency_code", "fiscal_year_start_month", "updated_at") VALUES
('cs000000-0000-0000-0000-000000000001', 'HRFlow Inc.', 'hr@hrflow.com', '(555) 123-4567', '123 Business Street, Tech City', 'USD', 1, NOW());

-- 2.5 Core Departments
INSERT INTO "departments" ("id", "department_name", "updated_at") VALUES
('d0000000-0000-0000-0000-000000000001', 'Engineering', NOW()),
('d0000000-0000-0000-0000-000000000002', 'Human Resources', NOW()),
('d0000000-0000-0000-0000-000000000003', 'Finance', NOW()),
('d0000000-0000-0000-0000-000000000004', 'Sales', NOW()),
('d0000000-0000-0000-0000-000000000005', 'Marketing', NOW());
