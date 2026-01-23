-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedAttempts" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockUntil" TIMESTAMPTZ,
ADD COLUMN     "resetToken" VARCHAR(36),
ADD COLUMN     "resetTokenExpiry" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE INDEX "attendances_is_active_is_deleted_idx" ON "attendances"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "attendances_created_at_idx" ON "attendances"("created_at");

-- CreateIndex
CREATE INDEX "attendances_updated_at_idx" ON "attendances"("updated_at");

-- CreateIndex
CREATE INDEX "company_settings_is_active_is_deleted_idx" ON "company_settings"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "company_settings_created_at_idx" ON "company_settings"("created_at");

-- CreateIndex
CREATE INDEX "company_settings_updated_at_idx" ON "company_settings"("updated_at");

-- CreateIndex
CREATE INDEX "currencies_code_idx" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_is_active_is_deleted_idx" ON "currencies"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "currencies_created_at_idx" ON "currencies"("created_at");

-- CreateIndex
CREATE INDEX "currencies_updated_at_idx" ON "currencies"("updated_at");

-- CreateIndex
CREATE INDEX "departments_department_name_idx" ON "departments"("department_name");

-- CreateIndex
CREATE INDEX "departments_is_active_is_deleted_idx" ON "departments"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "departments_created_at_idx" ON "departments"("created_at");

-- CreateIndex
CREATE INDEX "departments_updated_at_idx" ON "departments"("updated_at");

-- CreateIndex
CREATE INDEX "employee_positions_title_idx" ON "employee_positions"("title");

-- CreateIndex
CREATE INDEX "employee_positions_is_active_is_deleted_idx" ON "employee_positions"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "employee_positions_created_at_idx" ON "employee_positions"("created_at");

-- CreateIndex
CREATE INDEX "employee_positions_updated_at_idx" ON "employee_positions"("updated_at");

-- CreateIndex
CREATE INDEX "employee_tax_configs_is_active_is_deleted_idx" ON "employee_tax_configs"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "employee_tax_configs_created_at_idx" ON "employee_tax_configs"("created_at");

-- CreateIndex
CREATE INDEX "employee_tax_configs_updated_at_idx" ON "employee_tax_configs"("updated_at");

-- CreateIndex
CREATE INDEX "employees_shift_id_idx" ON "employees"("shift_id");

-- CreateIndex
CREATE INDEX "employees_employee_code_idx" ON "employees"("employee_code");

-- CreateIndex
CREATE INDEX "employees_is_active_is_deleted_idx" ON "employees"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "employees_created_at_idx" ON "employees"("created_at");

-- CreateIndex
CREATE INDEX "employees_updated_at_idx" ON "employees"("updated_at");

-- CreateIndex
CREATE INDEX "exchange_rates_is_active_is_deleted_idx" ON "exchange_rates"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "exchange_rates_created_at_idx" ON "exchange_rates"("created_at");

-- CreateIndex
CREATE INDEX "exchange_rates_updated_at_idx" ON "exchange_rates"("updated_at");

-- CreateIndex
CREATE INDEX "leave_balances_employee_id_idx" ON "leave_balances"("employee_id");

-- CreateIndex
CREATE INDEX "leave_balances_leave_type_idx" ON "leave_balances"("leave_type");

-- CreateIndex
CREATE INDEX "leave_balances_year_idx" ON "leave_balances"("year");

-- CreateIndex
CREATE INDEX "leave_balances_is_active_is_deleted_idx" ON "leave_balances"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "leave_balances_created_at_idx" ON "leave_balances"("created_at");

-- CreateIndex
CREATE INDEX "leave_balances_updated_at_idx" ON "leave_balances"("updated_at");

-- CreateIndex
CREATE INDEX "leave_requests_is_active_is_deleted_idx" ON "leave_requests"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "leave_requests_created_at_idx" ON "leave_requests"("created_at");

-- CreateIndex
CREATE INDEX "leave_requests_updated_at_idx" ON "leave_requests"("updated_at");

-- CreateIndex
CREATE INDEX "payroll_items_is_active_is_deleted_idx" ON "payroll_items"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "payroll_items_created_at_idx" ON "payroll_items"("created_at");

-- CreateIndex
CREATE INDEX "payroll_items_updated_at_idx" ON "payroll_items"("updated_at");

-- CreateIndex
CREATE INDEX "payrolls_is_active_is_deleted_idx" ON "payrolls"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "payrolls_created_at_idx" ON "payrolls"("created_at");

-- CreateIndex
CREATE INDEX "payrolls_updated_at_idx" ON "payrolls"("updated_at");

-- CreateIndex
CREATE INDEX "public_holidays_is_active_is_deleted_idx" ON "public_holidays"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "public_holidays_created_at_idx" ON "public_holidays"("created_at");

-- CreateIndex
CREATE INDEX "public_holidays_updated_at_idx" ON "public_holidays"("updated_at");

-- CreateIndex
CREATE INDEX "shifts_name_idx" ON "shifts"("name");

-- CreateIndex
CREATE INDEX "shifts_is_active_is_deleted_idx" ON "shifts"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "shifts_created_at_idx" ON "shifts"("created_at");

-- CreateIndex
CREATE INDEX "shifts_updated_at_idx" ON "shifts"("updated_at");

-- CreateIndex
CREATE INDEX "slugs_is_active_is_deleted_idx" ON "slugs"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "slugs_created_at_idx" ON "slugs"("created_at");

-- CreateIndex
CREATE INDEX "slugs_updated_at_idx" ON "slugs"("updated_at");

-- CreateIndex
CREATE INDEX "tax_brackets_currency_code_idx" ON "tax_brackets"("currency_code");

-- CreateIndex
CREATE INDEX "tax_brackets_tax_year_idx" ON "tax_brackets"("tax_year");

-- CreateIndex
CREATE INDEX "tax_brackets_is_active_is_deleted_idx" ON "tax_brackets"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "tax_brackets_created_at_idx" ON "tax_brackets"("created_at");

-- CreateIndex
CREATE INDEX "tax_brackets_updated_at_idx" ON "tax_brackets"("updated_at");

-- CreateIndex
CREATE INDEX "tax_calculations_is_active_is_deleted_idx" ON "tax_calculations"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "tax_calculations_created_at_idx" ON "tax_calculations"("created_at");

-- CreateIndex
CREATE INDEX "tax_calculations_updated_at_idx" ON "tax_calculations"("updated_at");

-- CreateIndex
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");
