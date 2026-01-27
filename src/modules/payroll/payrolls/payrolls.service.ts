import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { ProcessPayrollDto } from './dtos/process-payroll.dto';
import { PayrollDto } from './dtos/payroll.dto';
import {
    PayrollSummaryDto,
    PayrollSummaryByStatusDto,
    PayrollSummaryByDepartmentDto,
} from './dtos/payroll-summary.dto';
import {
    GeneratePayrollDto,
    GeneratePayrollResultDto,
} from './dtos/generate-payroll.dto';
import { Result } from '../../../common/logic/result';
import { plainToInstance } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';

// Constants for payroll calculation
const MONTHLY_WORKING_HOURS = 160;
const OVERTIME_MULTIPLIER = 1.5;

export enum PayrollStatus {
    PENDING = 'PENDING',
    PROCESSED = 'PROCESSED',
    PAID = 'PAID',
}

export enum PayrollItemType {
    EARNING = 'EARNING',
    DEDUCTION = 'DEDUCTION',
}

@Injectable()
export class PayrollsService {
    private readonly logger = new Logger(PayrollsService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Creates a draft payroll with calculated values (Gross, Tax, Net).
     */
    async createDraftAsync(
        dto: ProcessPayrollDto,
        performBy: string,
    ): Promise<Result<PayrollDto>> {
        try {
            // 1. Validate dates
            const periodStart = new Date(dto.payPeriodStart);
            const periodEnd = new Date(dto.payPeriodEnd);
            if (periodEnd <= periodStart) {
                return Result.fail('Pay period end must be after start date');
            }

            // 2. Fetch Employee with position and tax config
            const employee = await this.prisma.client.employee.findUnique({
                where: { id: dto.employeeId, isDeleted: false },
                include: {
                    position: true,
                    taxConfig: true,
                },
            });

            if (!employee) {
                return Result.fail('Employee not found');
            }

            // 3. Validate currency
            const currency = await this.prisma.client.currency.findUnique({
                where: { code: dto.currencyCode, isDeleted: false },
            });
            if (!currency) {
                return Result.fail('Invalid currency code');
            }

            // 4. Calculate Gross
            const basicSalary = dto.basicSalaryOverride
                ? new Decimal(dto.basicSalaryOverride)
                : employee.position.salaryRangeMin;

            const overtimeHours = new Decimal(dto.overtimeHours ?? 0);
            const hourlyRate = basicSalary.dividedBy(MONTHLY_WORKING_HOURS);
            const overtimeRate = hourlyRate.times(OVERTIME_MULTIPLIER);
            const overtimePay = overtimeRate.times(overtimeHours);

            const bonus = new Decimal(dto.bonus ?? 0);
            const grossIncome = basicSalary.plus(overtimePay).plus(bonus);

            // 5. Calculate Tax
            let taxAmount = new Decimal(0);
            let taxBracketId: string | null = null;
            let taxRateUsed = new Decimal(0);

            const taxConfig = employee.taxConfig;
            const isTaxExempt = taxConfig?.taxExempt ?? false;

            if (!isTaxExempt) {
                // Find applicable tax bracket
                const currentYear = new Date().getFullYear();
                const taxCountry = taxConfig?.taxCountry ?? 'KH'; // Default to Cambodia

                const bracket = await this.prisma.client.taxBracket.findFirst({
                    where: {
                        countryCode: taxCountry,
                        taxYear: currentYear,
                        currencyCode: dto.currencyCode,
                        minAmount: { lte: grossIncome },
                        maxAmount: { gt: grossIncome },
                        isDeleted: false,
                    },
                    orderBy: { minAmount: 'desc' },
                });

                if (bracket) {
                    // Tax = (Gross * Rate) - FixedAmount
                    taxAmount = grossIncome
                        .times(bracket.taxRate)
                        .minus(bracket.fixedAmount);
                    if (taxAmount.lessThan(0)) {
                        taxAmount = new Decimal(0);
                    }
                    taxBracketId = bracket.id;
                    taxRateUsed = bracket.taxRate;
                }
            }

            // 6. Calculate Net
            const deductions = new Decimal(dto.deductions ?? 0);
            const totalDeductions = taxAmount.plus(deductions);
            const netSalary = grossIncome.minus(totalDeductions);

            // 7. Create Payroll record with items using transaction
            const payroll = await this.prisma.client.$transaction(
                async (tx) => {
                    const newPayroll = await tx.payroll.create({
                        data: {
                            employeeId: dto.employeeId,
                            currencyCode: dto.currencyCode,
                            payPeriodStart: periodStart,
                            payPeriodEnd: periodEnd,
                            basicSalary: basicSalary,
                            overtimeHrs: overtimeHours,
                            overtimeRate: overtimeRate,
                            bonus: bonus,
                            deductions: deductions,
                            netSalary: netSalary,
                            status: PayrollStatus.PENDING,
                            performBy,
                        },
                    });

                    // Create PayrollItems
                    const itemsData = [
                        {
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.EARNING,
                            itemName: 'Basic Salary',
                            amount: basicSalary,
                            description: 'Monthly base salary',
                            performBy,
                        },
                    ];

                    if (overtimePay.greaterThan(0)) {
                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.EARNING,
                            itemName: 'Overtime',
                            amount: overtimePay,
                            description: `${overtimeHours.toFixed(2)} hours @ ${overtimeRate.toFixed(2)}/hr`,
                            performBy,
                        });
                    }

                    if (bonus.greaterThan(0)) {
                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.EARNING,
                            itemName: 'Bonus',
                            amount: bonus,
                            description: 'Performance bonus',
                            performBy,
                        });
                    }

                    if (taxAmount.greaterThan(0)) {
                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.DEDUCTION,
                            itemName: 'Tax',
                            amount: taxAmount,
                            description: `Tax rate: ${taxRateUsed.times(100).toFixed(2)}%`,
                            performBy,
                        });
                    }

                    if (deductions.greaterThan(0)) {
                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.DEDUCTION,
                            itemName: 'Other Deductions',
                            amount: deductions,
                            description: 'Additional deductions',
                            performBy,
                        });
                    }

                    await tx.payrollItems.createMany({ data: itemsData });

                    // Create TaxCalculation snapshot if tax was applied
                    if (taxBracketId) {
                        await tx.taxCalculation.create({
                            data: {
                                payrollId: newPayroll.id,
                                employeeId: dto.employeeId,
                                taxBracketId: taxBracketId,
                                taxPeriodStart: periodStart,
                                taxPeriodEnd: periodEnd,
                                grossIncome: grossIncome,
                                taxableIncome: grossIncome, // Simplified: taxable = gross
                                taxAmount: taxAmount,
                                taxRateUsed: taxRateUsed,
                                performBy,
                            },
                        });
                    }

                    return newPayroll;
                },
            );

            // Fetch complete payroll with relations
            return this.findByIdAsync(payroll.id);
        } catch (error) {
            this.logger.error('Failed to create payroll draft', error);
            return Result.fail('Failed to create payroll');
        }
    }

    /**
     * Finalizes a payroll, changing status to PROCESSED.
     */
    async finalizeAsync(
        id: string,
        performBy: string,
    ): Promise<Result<PayrollDto>> {
        try {
            const payroll = await this.prisma.client.payroll.findUnique({
                where: { id, isDeleted: false },
            });

            if (!payroll) {
                return Result.fail('Payroll not found');
            }

            if (payroll.status !== (PayrollStatus.PENDING as string)) {
                return Result.fail(
                    `Cannot finalize payroll with status: ${payroll.status}`,
                );
            }

            await this.prisma.client.payroll.update({
                where: { id },
                data: {
                    status: PayrollStatus.PROCESSED,
                    processedAt: new Date(),
                    performBy,
                },
            });

            return this.findByIdAsync(id);
        } catch (error) {
            this.logger.error('Failed to finalize payroll', error);
            return Result.fail('Failed to finalize payroll');
        }
    }

    /**
     * Gets a single payroll with items and tax details.
     */
    async findByIdAsync(id: string): Promise<Result<PayrollDto>> {
        try {
            const payroll = await this.prisma.client.payroll.findUnique({
                where: { id, isDeleted: false },
                include: {
                    items: {
                        where: { isDeleted: false },
                    },
                    taxCalculation: true,
                },
            });

            if (!payroll) {
                return Result.fail('Payroll not found');
            }

            return Result.ok(
                plainToInstance(PayrollDto, payroll, {
                    excludeExtraneousValues: true,
                }),
            );
        } catch (error) {
            this.logger.error('Failed to fetch payroll', error);
            return Result.fail('Failed to fetch payroll');
        }
    }

    /**
     * Lists payrolls with optional filters.
     */
    async findAllAsync(params?: {
        employeeId?: string;
        status?: string;
        year?: number;
        month?: number;
    }): Promise<Result<PayrollDto[]>> {
        try {
            const where: Prisma.PayrollWhereInput = { isDeleted: false };

            if (params?.employeeId) {
                where.employeeId = params.employeeId;
            }

            if (params?.status) {
                where.status = params.status;
            }

            if (params?.year && params?.month) {
                const startOfMonth = new Date(params.year, params.month - 1, 1);
                const endOfMonth = new Date(params.year, params.month, 0);
                where.payPeriodStart = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            }

            const payrolls = await this.prisma.client.payroll.findMany({
                where,
                include: {
                    items: {
                        where: { isDeleted: false },
                    },
                    taxCalculation: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            return Result.ok(
                payrolls.map((p) =>
                    plainToInstance(PayrollDto, p, {
                        excludeExtraneousValues: true,
                    }),
                ),
            );
        } catch (error) {
            this.logger.error('Failed to fetch payrolls', error);
            return Result.fail('Failed to fetch payrolls');
        }
    }

    /**
     * Lists payrolls with optional filters (Paginated).
     */
    async findAllPaginatedAsync(
        page: number,
        limit: number,
        params?: {
            employeeId?: string;
            status?: string;
            year?: number;
            month?: number;
        },
    ): Promise<
        Result<{
            data: PayrollDto[];
            meta: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrevious: boolean;
            };
        }>
    > {
        try {
            const skip = (page - 1) * limit;
            const where: Prisma.PayrollWhereInput = { isDeleted: false };

            if (params?.employeeId) {
                where.employeeId = params.employeeId;
            }

            if (params?.status) {
                where.status = params.status;
            }

            if (params?.year && params?.month) {
                const startOfMonth = new Date(params.year, params.month - 1, 1);
                const endOfMonth = new Date(params.year, params.month, 0);
                where.payPeriodStart = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            }

            const [payrolls, total] = await this.prisma.$transaction([
                this.prisma.client.payroll.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        items: {
                            where: { isDeleted: false },
                        },
                        taxCalculation: true,
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.client.payroll.count({ where }),
            ]);

            const data = payrolls.map((p) =>
                plainToInstance(PayrollDto, p, {
                    excludeExtraneousValues: true,
                }),
            );
            const totalPages = Math.ceil(total / limit);

            return Result.ok({
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: skip + limit < total,
                    hasPrevious: skip > 0,
                },
            });
        } catch (error) {
            this.logger.error('Failed to fetch payrolls', error);
            return Result.fail('Failed to fetch payrolls');
        }
    }

    /**
     * Soft deletes a payroll (only if PENDING).
     */
    async deleteAsync(id: string, performBy: string): Promise<Result<void>> {
        try {
            const payroll = await this.prisma.client.payroll.findUnique({
                where: { id, isDeleted: false },
            });

            if (!payroll) {
                return Result.fail('Payroll not found');
            }

            if (payroll.status !== (PayrollStatus.PENDING as string)) {
                return Result.fail('Only PENDING payrolls can be deleted');
            }

            await this.prisma.client.payroll.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    performBy,
                },
            });

            return Result.ok();
        } catch (error) {
            this.logger.error('Failed to delete payroll', error);
            return Result.fail('Failed to delete payroll');
        }
    }

    /**
     * Gets payroll summary with totals and breakdowns.
     */
    async getSummaryAsync(params?: {
        year?: number;
        month?: number;
        departmentId?: string;
    }): Promise<Result<PayrollSummaryDto>> {
        try {
            const where: Prisma.PayrollWhereInput = { isDeleted: false };

            if (params?.year && params?.month) {
                const startOfMonth = new Date(params.year, params.month - 1, 1);
                const endOfMonth = new Date(params.year, params.month, 0);
                where.payPeriodStart = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            } else if (params?.year) {
                const startOfYear = new Date(params.year, 0, 1);
                const endOfYear = new Date(params.year, 11, 31);
                where.payPeriodStart = {
                    gte: startOfYear,
                    lte: endOfYear,
                };
            }

            if (params?.departmentId) {
                where.employee = { departmentId: params.departmentId };
            }

            const payrolls = await this.prisma.client.payroll.findMany({
                where,
                include: {
                    employee: {
                        include: { department: true },
                    },
                    items: { where: { isDeleted: false } },
                },
            });

            let totalGrossSalary = new Decimal(0);
            let totalDeductions = new Decimal(0);
            let totalNetSalary = new Decimal(0);
            let totalTax = new Decimal(0);
            let totalOvertimePay = new Decimal(0);
            let totalBonus = new Decimal(0);

            const statusCounts: Record<
                string,
                { count: number; totalAmount: Decimal }
            > = {};
            const departmentData: Record<
                string,
                {
                    employeeIds: Set<string>;
                    totalSalary: Decimal;
                    totalDeductions: Decimal;
                    totalNetSalary: Decimal;
                }
            > = {};

            for (const payroll of payrolls) {
                const gross = payroll.basicSalary
                    .plus(payroll.overtimeRate.times(payroll.overtimeHrs))
                    .plus(payroll.bonus);

                totalGrossSalary = totalGrossSalary.plus(gross);
                totalDeductions = totalDeductions.plus(payroll.deductions);
                totalNetSalary = totalNetSalary.plus(payroll.netSalary);
                totalOvertimePay = totalOvertimePay.plus(
                    payroll.overtimeRate.times(payroll.overtimeHrs),
                );
                totalBonus = totalBonus.plus(payroll.bonus);

                // Tax from items
                for (const item of payroll.items) {
                    if (item.itemName === 'Tax') {
                        totalTax = totalTax.plus(item.amount);
                    }
                }

                // Status breakdown
                if (!statusCounts[payroll.status]) {
                    statusCounts[payroll.status] = {
                        count: 0,
                        totalAmount: new Decimal(0),
                    };
                }
                statusCounts[payroll.status].count++;
                statusCounts[payroll.status].totalAmount = statusCounts[
                    payroll.status
                ].totalAmount.plus(payroll.netSalary);

                // Department breakdown
                const deptName =
                    payroll.employee?.department?.departmentName ?? 'Unknown';
                if (!departmentData[deptName]) {
                    departmentData[deptName] = {
                        employeeIds: new Set(),
                        totalSalary: new Decimal(0),
                        totalDeductions: new Decimal(0),
                        totalNetSalary: new Decimal(0),
                    };
                }
                departmentData[deptName].employeeIds.add(payroll.employeeId);
                departmentData[deptName].totalSalary =
                    departmentData[deptName].totalSalary.plus(gross);
                departmentData[deptName].totalDeductions = departmentData[
                    deptName
                ].totalDeductions.plus(payroll.deductions);
                departmentData[deptName].totalNetSalary = departmentData[
                    deptName
                ].totalNetSalary.plus(payroll.netSalary);
            }

            const byStatus: PayrollSummaryByStatusDto[] = Object.entries(
                statusCounts,
            ).map(([status, data]) => ({
                status,
                count: data.count,
                totalAmount: Number(data.totalAmount),
            }));

            const byDepartment: PayrollSummaryByDepartmentDto[] =
                Object.entries(departmentData).map(([department, data]) => ({
                    department,
                    employeeCount: data.employeeIds.size,
                    totalSalary: Number(data.totalSalary),
                    totalDeductions: Number(data.totalDeductions),
                    totalNetSalary: Number(data.totalNetSalary),
                }));

            const summary: PayrollSummaryDto = {
                totalPayrolls: payrolls.length,
                totalGrossSalary: Number(totalGrossSalary),
                totalDeductions: Number(totalDeductions),
                totalNetSalary: Number(totalNetSalary),
                totalTax: Number(totalTax),
                totalOvertimePay: Number(totalOvertimePay),
                totalBonus: Number(totalBonus),
                byStatus,
                byDepartment,
            };

            return Result.ok(summary);
        } catch (error) {
            this.logger.error('Failed to get payroll summary', error);
            return Result.fail('Failed to get payroll summary');
        }
    }

    /**
     * Bulk generate payrolls for multiple employees.
     */
    async generateBulkAsync(
        dto: GeneratePayrollDto,
        performBy: string,
    ): Promise<Result<GeneratePayrollResultDto>> {
        try {
            const periodStart = new Date(dto.payPeriodStart);
            const periodEnd = new Date(dto.payPeriodEnd);

            if (periodEnd <= periodStart) {
                return Result.fail('Pay period end must be after start date');
            }

            // Validate currency
            const currency = await this.prisma.client.currency.findUnique({
                where: { code: dto.currencyCode, isDeleted: false },
            });
            if (!currency) {
                return Result.fail('Invalid currency code');
            }

            // Get list of employees to generate payroll for
            const employeeWhere: Prisma.EmployeeWhereInput = {
                isDeleted: false,
                isActive: true,
                status: 'ACTIVE' as Prisma.EmployeeWhereInput['status'],
            };

            if (dto.employeeIds && dto.employeeIds.length > 0) {
                employeeWhere.id = { in: dto.employeeIds };
            } else if (dto.departmentId) {
                employeeWhere.departmentId = dto.departmentId;
            }

            const employees = await this.prisma.client.employee.findMany({
                where: employeeWhere,
                include: {
                    position: true,
                    taxConfig: true,
                    department: true,
                },
            });

            if (employees.length === 0) {
                return Result.fail(
                    'No active employees found matching criteria',
                );
            }

            const result: GeneratePayrollResultDto = {
                totalGenerated: 0,
                totalSkipped: 0,
                totalFailed: 0,
                generatedPayrollIds: [],
                skippedEmployees: [],
                failedEmployees: [],
            };

            for (const employee of employees) {
                try {
                    // Check if payroll already exists for this period
                    const existingPayroll =
                        await this.prisma.client.payroll.findFirst({
                            where: {
                                employeeId: employee.id,
                                payPeriodStart: periodStart,
                                payPeriodEnd: periodEnd,
                                isDeleted: false,
                            },
                        });

                    if (existingPayroll) {
                        result.totalSkipped++;
                        result.skippedEmployees.push({
                            employeeId: employee.id,
                            employeeName: `${employee.firstname} ${employee.lastname}`,
                            reason: 'Payroll already exists for this period',
                        });
                        continue;
                    }

                    // Create payroll using existing method logic
                    const createResult = await this.createDraftAsync(
                        {
                            employeeId: employee.id,
                            payPeriodStart: dto.payPeriodStart,
                            payPeriodEnd: dto.payPeriodEnd,
                            currencyCode: dto.currencyCode,
                            overtimeHours: 0,
                            bonus: 0,
                            deductions: 0,
                        },
                        performBy,
                    );

                    if (createResult.isSuccess) {
                        result.totalGenerated++;
                        const payroll = createResult.getData();
                        if (payroll) {
                            result.generatedPayrollIds.push(payroll.id);
                        }
                    } else {
                        result.totalFailed++;
                        result.failedEmployees.push({
                            employeeId: employee.id,
                            employeeName: `${employee.firstname} ${employee.lastname}`,
                            error: createResult.error ?? 'Unknown error',
                        });
                    }
                } catch (error) {
                    result.totalFailed++;
                    result.failedEmployees.push({
                        employeeId: employee.id,
                        employeeName: `${employee.firstname} ${employee.lastname}`,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    });
                }
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error('Failed to generate bulk payrolls', error);
            return Result.fail('Failed to generate payrolls');
        }
    }
}
