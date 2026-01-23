import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { ProcessPayrollDto } from './dtos/process-payroll.dto';
import { PayrollDto } from './dtos/payroll.dto';
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
}
