-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "currencies" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "employee_positions" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "employee_tax_configs" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "tax_brackets" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "tax_calculations" ADD COLUMN     "perform_by" VARCHAR(36);

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "perform_by" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_positions" ADD CONSTRAINT "employee_positions_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_tax_configs" ADD CONSTRAINT "employee_tax_configs_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_perform_by_fkey" FOREIGN KEY ("perform_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
