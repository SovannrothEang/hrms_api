import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { CommonMapper } from 'src/common/mappers/common.mapper';
import { ProcessPayrollDto } from './dtos/process-payroll.dto';
import { PayrollDto } from './dtos/payroll.dto';
import { PayrollQueryDto } from './dtos/payroll-query.dto';
import {
    PayrollSummaryDto,
    PayrollSummaryByStatusDto,
    PayrollSummaryByDepartmentDto,
} from './dtos/payroll-summary.dto';
import {
    GeneratePayrollDto,
    GeneratePayrollResultDto,
} from './dtos/generate-payroll.dto';
import { UpdatePayrollDto } from './dtos/update-payroll.dto';
import {
    MePayslipResponseDto,
    MePayslipRecordDto,
    MePayslipSummaryDto,
    MePayslipYtdDto,
} from './dtos/me-payslip-response.dto';
import { Result } from '../../../common/logic/result';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';
import { ResultPagination } from '../../../common/logic/result-pagination';

import PDFDocument from 'pdfkit';
import { DecimalNumber } from '../../../config/decimal-number';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

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

type PayslipPayroll = Prisma.PayrollGetPayload<{
    include: {
        employee: {
            include: {
                department: true;
                position: true;
            };
        };
        items: true;
    };
}>;

@Injectable()
export class PayrollsService {
    private readonly logger = new Logger(PayrollsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly exchangeRatesService: ExchangeRatesService,
    ) {}

    /**
     * Calculate taxable income.
     * Currently simplified: taxable income = gross income.
     * (No abstract deductions like family relief are applied here as per instructions).
     */
    private calculateTaxableIncome(grossIncome: Decimal): Decimal {
        return grossIncome;
    }

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

            // 1b. Check for existing payroll for this period
            const existing = await this.prisma.client.payroll.findFirst({
                where: {
                    employeeId: dto.employeeId,
                    payPeriodStart: periodStart,
                    payPeriodEnd: periodEnd,
                    isDeleted: false,
                },
            });

            if (existing) {
                return Result.fail(
                    `Payroll already exists for this employee in the period ${dto.payPeriodStart} to ${dto.payPeriodEnd}`,
                );
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
                : employee.salary || employee.position.salaryRangeMin;

            const overtimeHours = new Decimal(dto.overtimeHours ?? 0);
            const hourlyRate = basicSalary.dividedBy(MONTHLY_WORKING_HOURS);
            const overtimeRate = hourlyRate.times(OVERTIME_MULTIPLIER);
            const overtimePay = overtimeRate.times(overtimeHours);

            const bonus = new Decimal(dto.bonus ?? 0);
            const grossIncome = basicSalary.plus(overtimePay).plus(bonus);

            // 5. Calculate Tax and other bracket-based deductions
            let totalTaxAmount = new Decimal(0);
            let taxableIncome = this.calculateTaxableIncome(grossIncome);
            const matchingBrackets: {
                bracket: any;
                amount: Decimal;
                rate: Decimal;
                convertedIncome: Decimal;
            }[] = [];

            const taxConfig = employee.taxConfig;
            const isTaxExempt = taxConfig?.taxExempt ?? false;

            if (!isTaxExempt) {
                const currentYear = new Date().getFullYear();
                const taxCountry = taxConfig?.taxCountry ?? 'KH';

                // Fetch all active brackets for this country and year
                const allBrackets =
                    await this.prisma.client.taxBracket.findMany({
                        where: {
                            countryCode: taxCountry,
                            taxYear: currentYear,
                            isDeleted: false,
                        },
                    });

                for (const bracket of allBrackets) {
                    let convertedIncome = taxableIncome;
                    let exchangeRate = new Decimal(1);

                    // Convert income to bracket currency if different
                    if (bracket.currencyCode !== dto.currencyCode) {
                        const rateResult =
                            await this.exchangeRatesService.getLatestRateAsync(
                                dto.currencyCode,
                                bracket.currencyCode,
                            );
                        if (rateResult.isSuccess) {
                            exchangeRate = new Decimal(rateResult.getData());
                            convertedIncome = taxableIncome.times(exchangeRate);
                        } else {
                            continue;
                        }
                    }

                    // CHECK RANGE:
                    // A bracket matches if:
                    // 1. Min and Max are both 0 (Universal deduction for ALL employees)
                    // 2. OR income is within [min, max)
                    const isUniversal =
                        bracket.minAmount.equals(0) &&
                        bracket.maxAmount.equals(0);
                    const isInRange =
                        convertedIncome.greaterThanOrEqualTo(
                            bracket.minAmount,
                        ) &&
                        (convertedIncome.lessThan(bracket.maxAmount) ||
                            bracket.maxAmount.equals(0));

                    if (isUniversal || isInRange) {
                        // Calculate amount in bracket currency: (Income * Rate) - Fixed
                        // If Universal (0-0), user likely just wants the Fixed Amount or a flat rate
                        let bracketAmount = convertedIncome
                            .times(bracket.taxRate)
                            .minus(bracket.fixedAmount);

                        // If it's a fixed amount deduction with 0% rate (like NSSF flat fee)
                        // but it's defined as a "fixed amount" to subtract, we might need to flip logic.
                        // Actually, if fixedAmount is positive, it reduces the tax?
                        // Usually, Khmer tax is (Income * Rate) - Constant.
                        // If it's JUST NSSF flat fee, user might set Rate=0 and FixedAmount=-11500?
                        // But looking at Image 1, Fixed Amount is 11,500 and Rate is 0%.
                        // (Income * 0) - 11,500 = -11,500.
                        // We should probably take the absolute if the user is using it as a "flat deduction".

                        if (
                            bracket.taxRate.equals(0) &&
                            bracket.fixedAmount.greaterThan(0)
                        ) {
                            bracketAmount = bracket.fixedAmount;
                        }

                        if (bracketAmount.lessThan(0)) {
                            bracketAmount = bracketAmount.abs();
                        }

                        if (bracketAmount.greaterThan(0)) {
                            // Convert back to payroll currency
                            const finalAmount =
                                bracketAmount.dividedBy(exchangeRate);

                            matchingBrackets.push({
                                bracket,
                                amount: finalAmount,
                                rate: bracket.taxRate,
                                convertedIncome,
                            });
                            totalTaxAmount = totalTaxAmount.plus(finalAmount);
                        }
                    }
                }
            }

            // 6. Calculate Net
            const otherDeductions = new Decimal(dto.deductions ?? 0);
            const totalDeductions = totalTaxAmount.plus(otherDeductions);
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
                            deductions: otherDeductions, // Manual deductions
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
                            description: `${overtimeHours.toFixed(2)} hours @ ${overtimeRate.toFixed(2)}/hr (${OVERTIME_MULTIPLIER}x multiplier)`,
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

                    // Add items for each matching bracket (Tax, NSSF, etc.)
                    for (const match of matchingBrackets) {
                        const { bracket, amount, rate, convertedIncome } =
                            match;
                        const isTax = bracket.bracketName
                            .toLowerCase()
                            .includes('tax');

                        let description = `${bracket.bracketName}: `;
                        if (rate.greaterThan(0)) {
                            description += `Calculated on ${Number(convertedIncome).toLocaleString()} ${bracket.currencyCode} @ ${rate.times(100).toFixed(2)}%`;
                        } else {
                            description += `Fixed amount ${Number(bracket.fixedAmount).toLocaleString()} ${bracket.currencyCode}`;
                        }

                        if (bracket.currencyCode !== dto.currencyCode) {
                            description += ` (converted to ${dto.currencyCode})`;
                        }

                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.DEDUCTION,
                            itemName: bracket.bracketName,
                            amount: amount,
                            description: description,
                            performBy,
                        });
                    }

                    if (otherDeductions.greaterThan(0)) {
                        itemsData.push({
                            payrollId: newPayroll.id,
                            currencyCode: dto.currencyCode,
                            itemType: PayrollItemType.DEDUCTION,
                            itemName: dto.deductionName || 'Other Deductions',
                            amount: otherDeductions,
                            description:
                                dto.deductionDescription ||
                                'Additional deductions',
                            performBy,
                        });
                    }

                    await tx.payrollItems.createMany({ data: itemsData });

                    // Create TaxCalculation snapshot for the first tax-like bracket if any
                    const primaryTaxMatch =
                        matchingBrackets.find((m) =>
                            m.bracket.bracketName.toLowerCase().includes('tax'),
                        ) || matchingBrackets[0];
                    if (primaryTaxMatch) {
                        await tx.taxCalculation.create({
                            data: {
                                payrollId: newPayroll.id,
                                employeeId: dto.employeeId,
                                taxBracketId: primaryTaxMatch.bracket.id,
                                taxPeriodStart: periodStart,
                                taxPeriodEnd: periodEnd,
                                grossIncome: grossIncome,
                                taxableIncome: taxableIncome,
                                taxAmount: totalTaxAmount, // Total of all matching brackets
                                taxRateUsed: primaryTaxMatch.rate,
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
     * Updates a pending payroll with new values and recalculates tax/net.
     */
    async updateAsync(
        id: string,
        dto: UpdatePayrollDto,
        performBy: string,
    ): Promise<Result<PayrollDto>> {
        try {
            const payroll = await this.prisma.client.payroll.findUnique({
                where: { id, isDeleted: false },
                include: {
                    employee: {
                        include: {
                            position: true,
                            taxConfig: true,
                        },
                    },
                    items: { where: { isDeleted: false } },
                    taxCalculation: true,
                },
            });

            if (!payroll) {
                return Result.fail('Payroll not found');
            }

            if (payroll.status !== (PayrollStatus.PENDING as string)) {
                return Result.fail(
                    `Cannot update payroll with status: ${payroll.status}. Only PENDING payrolls can be updated.`,
                );
            }

            const periodStart = dto.payPeriodStart
                ? new Date(dto.payPeriodStart)
                : payroll.payPeriodStart;
            const periodEnd = dto.payPeriodEnd
                ? new Date(dto.payPeriodEnd)
                : payroll.payPeriodEnd;

            if (periodEnd <= periodStart) {
                return Result.fail('Pay period end must be after start date');
            }

            const basicSalary = dto.basicSalaryOverride
                ? new Decimal(dto.basicSalaryOverride)
                : payroll.basicSalary;

            const overtimeHours =
                dto.overtimeHours !== undefined
                    ? new Decimal(dto.overtimeHours)
                    : payroll.overtimeHrs;
            const hourlyRate = basicSalary.dividedBy(MONTHLY_WORKING_HOURS);
            const overtimeRate = hourlyRate.times(OVERTIME_MULTIPLIER);
            const overtimePay = overtimeRate.times(overtimeHours);

            const bonus =
                dto.bonus !== undefined
                    ? new Decimal(dto.bonus)
                    : payroll.bonus;

            const grossIncome = basicSalary.plus(overtimePay).plus(bonus);

            const employee = payroll.employee;
            const taxConfig = employee.taxConfig;
            const isTaxExempt = taxConfig?.taxExempt ?? false;

            let totalTaxAmount = new Decimal(0);
            let taxableIncome = this.calculateTaxableIncome(grossIncome);
            const matchingBrackets: {
                bracket: any;
                amount: Decimal;
                rate: Decimal;
                convertedIncome: Decimal;
            }[] = [];

            if (!isTaxExempt) {
                const currentYear = new Date().getFullYear();
                const taxCountry = taxConfig?.taxCountry ?? 'KH';

                const allBrackets =
                    await this.prisma.client.taxBracket.findMany({
                        where: {
                            countryCode: taxCountry,
                            taxYear: currentYear,
                            isDeleted: false,
                        },
                    });

                for (const bracket of allBrackets) {
                    let convertedIncome = taxableIncome;
                    let exchangeRate = new Decimal(1);

                    if (bracket.currencyCode !== payroll.currencyCode) {
                        const rateResult =
                            await this.exchangeRatesService.getLatestRateAsync(
                                payroll.currencyCode,
                                bracket.currencyCode,
                            );
                        if (rateResult.isSuccess) {
                            exchangeRate = new Decimal(rateResult.getData());
                            convertedIncome = taxableIncome.times(exchangeRate);
                        } else {
                            continue;
                        }
                    }

                    const isUniversal =
                        bracket.minAmount.equals(0) &&
                        bracket.maxAmount.equals(0);
                    const isInRange =
                        convertedIncome.greaterThanOrEqualTo(
                            bracket.minAmount,
                        ) &&
                        (convertedIncome.lessThan(bracket.maxAmount) ||
                            bracket.maxAmount.equals(0));

                    if (isUniversal || isInRange) {
                        let bracketAmount = convertedIncome
                            .times(bracket.taxRate)
                            .minus(bracket.fixedAmount);

                        if (
                            bracket.taxRate.equals(0) &&
                            bracket.fixedAmount.greaterThan(0)
                        ) {
                            bracketAmount = bracket.fixedAmount;
                        }

                        if (bracketAmount.lessThan(0)) {
                            bracketAmount = bracketAmount.abs();
                        }

                        if (bracketAmount.greaterThan(0)) {
                            const finalAmount =
                                bracketAmount.dividedBy(exchangeRate);
                            matchingBrackets.push({
                                bracket,
                                amount: finalAmount,
                                rate: bracket.taxRate,
                                convertedIncome,
                            });
                            totalTaxAmount = totalTaxAmount.plus(finalAmount);
                        }
                    }
                }
            }

            const otherDeductions =
                dto.deductions !== undefined
                    ? new Decimal(dto.deductions)
                    : payroll.deductions;
            const totalDeductions = totalTaxAmount.plus(otherDeductions);
            const netSalary = grossIncome.minus(totalDeductions);

            await this.prisma.client.$transaction(async (tx) => {
                await tx.payroll.update({
                    where: { id },
                    data: {
                        payPeriodStart: periodStart,
                        payPeriodEnd: periodEnd,
                        basicSalary,
                        overtimeHrs: overtimeHours,
                        overtimeRate,
                        bonus,
                        deductions: otherDeductions,
                        netSalary,
                        performBy,
                    },
                });

                await tx.payrollItems.deleteMany({
                    where: { payrollId: id },
                });

                const itemsData = [
                    {
                        payrollId: id,
                        currencyCode: payroll.currencyCode,
                        itemType: PayrollItemType.EARNING,
                        itemName: 'Basic Salary',
                        amount: basicSalary,
                        description: 'Monthly base salary',
                        performBy,
                    },
                ];

                if (overtimePay.greaterThan(0)) {
                    itemsData.push({
                        payrollId: id,
                        currencyCode: payroll.currencyCode,
                        itemType: PayrollItemType.EARNING,
                        itemName: 'Overtime',
                        amount: overtimePay,
                        description: `${overtimeHours.toFixed(2)} hours @ ${overtimeRate.toFixed(2)}/hr (${OVERTIME_MULTIPLIER}x multiplier)`,
                        performBy,
                    });
                }

                if (bonus.greaterThan(0)) {
                    itemsData.push({
                        payrollId: id,
                        currencyCode: payroll.currencyCode,
                        itemType: PayrollItemType.EARNING,
                        itemName: 'Bonus',
                        amount: bonus,
                        description: 'Performance bonus',
                        performBy,
                    });
                }

                for (const match of matchingBrackets) {
                    const { bracket, amount, rate, convertedIncome } = match;
                    let description = `${bracket.bracketName}: `;
                    if (rate.greaterThan(0)) {
                        description += `Calculated on ${Number(convertedIncome).toLocaleString()} ${bracket.currencyCode} @ ${rate.times(100).toFixed(2)}%`;
                    } else {
                        description += `Fixed amount ${Number(bracket.fixedAmount).toLocaleString()} ${bracket.currencyCode}`;
                    }

                    if (bracket.currencyCode !== payroll.currencyCode) {
                        description += ` (converted to ${payroll.currencyCode})`;
                    }

                    itemsData.push({
                        payrollId: id,
                        currencyCode: payroll.currencyCode,
                        itemType: PayrollItemType.DEDUCTION,
                        itemName: bracket.bracketName,
                        amount: amount,
                        description: description,
                        performBy,
                    });
                }

                if (otherDeductions.greaterThan(0)) {
                    itemsData.push({
                        payrollId: id,
                        currencyCode: payroll.currencyCode,
                        itemType: PayrollItemType.DEDUCTION,
                        itemName: dto.deductionName || 'Other Deductions',
                        amount: otherDeductions,
                        description:
                            dto.deductionDescription || 'Additional deductions',
                        performBy,
                    });
                }

                await tx.payrollItems.createMany({ data: itemsData });

                if (payroll.taxCalculation) {
                    await tx.taxCalculation.delete({
                        where: { payrollId: id },
                    });
                }

                const primaryTaxMatch =
                    matchingBrackets.find((m) =>
                        m.bracket.bracketName.toLowerCase().includes('tax'),
                    ) || matchingBrackets[0];
                if (primaryTaxMatch) {
                    await tx.taxCalculation.create({
                        data: {
                            payrollId: id,
                            employeeId: payroll.employeeId,
                            taxBracketId: primaryTaxMatch.bracket.id,
                            taxPeriodStart: periodStart,
                            taxPeriodEnd: periodEnd,
                            grossIncome: grossIncome,
                            taxableIncome: taxableIncome,
                            taxAmount: totalTaxAmount,
                            taxRateUsed: primaryTaxMatch.rate,
                            performBy,
                        },
                    });
                }
            });

            return this.findByIdAsync(id);
        } catch (error) {
            this.logger.error('Failed to update payroll', error);
            return Result.fail('Failed to update payroll');
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
     * Marks a payroll as PAID.
     */
    async markAsPaidAsync(
        id: string,
        paymentDate: Date | undefined,
        performBy: string,
    ): Promise<Result<PayrollDto>> {
        try {
            const payroll = await this.prisma.client.payroll.findUnique({
                where: { id, isDeleted: false },
            });

            if (!payroll) {
                return Result.fail('Payroll not found');
            }

            if (payroll.status !== (PayrollStatus.PROCESSED as string)) {
                return Result.fail(
                    `Cannot mark as paid: payroll status is ${payroll.status}. Only PROCESSED payrolls can be marked as paid.`,
                );
            }

            await this.prisma.client.payroll.update({
                where: { id },
                data: {
                    status: PayrollStatus.PAID,
                    paymentDate: paymentDate || new Date(),
                    performBy,
                },
            });

            return this.findByIdAsync(id);
        } catch (error) {
            this.logger.error('Failed to mark payroll as paid', error);
            return Result.fail('Failed to mark payroll as paid');
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

            return Result.ok(CommonMapper.mapToPayrollDto(payroll)!);
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
                payrolls.map((p) => CommonMapper.mapToPayrollDto(p)!),
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
        query: PayrollQueryDto,
    ): Promise<Result<ResultPagination<PayrollDto>>> {
        try {
            const {
                page = 1,
                limit = 10,
                employeeId,
                status,
                year,
                month,
                sortBy = 'payPeriodStart',
                sortOrder = 'desc',
                skip,
            } = query;

            const where: Prisma.PayrollWhereInput = { isDeleted: false };

            if (employeeId) {
                where.employeeId = employeeId;
            }

            if (status) {
                where.status = status;
            }

            if (year && month) {
                const startOfMonth = new Date(year, month - 1, 1);
                const endOfMonth = new Date(year, month, 0);
                where.payPeriodStart = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            }

            const orderBy: Prisma.PayrollOrderByWithRelationInput = {};
            if (sortBy === 'payPeriodStart') orderBy.payPeriodStart = sortOrder;
            else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;
            else if (sortBy === 'updatedAt') orderBy.updatedAt = sortOrder;

            const [payrolls, total] = await this.prisma.client.$transaction([
                this.prisma.client.payroll.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        items: {
                            where: { isDeleted: false },
                        },
                        employee: {
                            include: {
                                department: {
                                    select: { departmentName: true },
                                },
                                position: { select: { title: true } },
                                user: {
                                    select: { id: true, profileImage: true },
                                },
                            },
                        },
                        taxCalculation: true,
                    },
                    orderBy,
                }),
                this.prisma.client.payroll.count({ where }),
            ]);

            const data = payrolls.map((p) => CommonMapper.mapToPayrollDto(p)!);

            return Result.ok(ResultPagination.of(data, total, page, limit));
        } catch (error) {
            this.logger.error('Failed to fetch payrolls', error);
            return Result.fail('Failed to fetch payrolls');
        }
    }

    async findAllFilteredAsync(
        query: PayrollQueryDto,
    ): Promise<Result<ResultPagination<PayrollDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return paginationResult;
        } catch (error) {
            this.logger.error('Failed to fetch filtered payrolls', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
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
     * Calculate overtime hours from attendance records for an employee in a period.
     */
    private async calculateOvertimeFromAttendanceAsync(
        employeeId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<number> {
        const result = await this.prisma.client.attendance.aggregate({
            where: {
                employeeId,
                date: {
                    gte: periodStart,
                    lte: periodEnd,
                },
                isDeleted: false,
            },
            _sum: {
                overtime: true,
            },
        });

        return Number(result._sum.overtime ?? 0);
    }

    /**
     * Calculate unpaid leave deduction for an employee in a period.
     * Returns the deduction amount based on daily rate and unpaid leave days.
     */
    private async calculateLeaveDeductionAsync(
        employeeId: string,
        basicSalary: Decimal,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{ deductionAmount: number; unpaidDays: number }> {
        const unpaidLeaves = await this.prisma.client.leaveRequest.findMany({
            where: {
                employeeId,
                status: 'APPROVED',
                leaveType: 'UNPAID',
                isDeleted: false,
                OR: [
                    {
                        startDate: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                    {
                        endDate: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                    {
                        AND: [
                            { startDate: { lte: periodStart } },
                            { endDate: { gte: periodEnd } },
                        ],
                    },
                ],
            },
        });

        let totalUnpaidDays = 0;

        for (const leave of unpaidLeaves) {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);

            const effectiveStart =
                leaveStart < periodStart ? periodStart : leaveStart;
            const effectiveEnd = leaveEnd > periodEnd ? periodEnd : leaveEnd;

            const daysDiff =
                Math.ceil(
                    (effectiveEnd.getTime() - effectiveStart.getTime()) /
                        (1000 * 60 * 60 * 24),
                ) + 1;

            totalUnpaidDays += daysDiff;
        }

        if (totalUnpaidDays === 0) {
            return { deductionAmount: 0, unpaidDays: 0 };
        }

        const monthlyWorkingDays = 22;
        const dailyRate = basicSalary.dividedBy(monthlyWorkingDays);
        const deductionAmount = dailyRate.times(totalUnpaidDays);

        return {
            deductionAmount: Number(deductionAmount),
            unpaidDays: totalUnpaidDays,
        };
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

                    // Calculate overtime and leave deductions if auto-calculate is enabled
                    const shouldAutoCalculate = dto.autoCalculate !== false; // default to true
                    let overtimeHours = 0;
                    let leaveDeductions = 0;

                    if (shouldAutoCalculate) {
                        overtimeHours =
                            await this.calculateOvertimeFromAttendanceAsync(
                                employee.id,
                                periodStart,
                                periodEnd,
                            );

                        const basicSalary =
                            employee.salary || employee.position.salaryRangeMin;
                        const leaveDeductionResult =
                            await this.calculateLeaveDeductionAsync(
                                employee.id,
                                basicSalary,
                                periodStart,
                                periodEnd,
                            );
                        leaveDeductions = leaveDeductionResult.deductionAmount;

                        const unpaidDays = leaveDeductionResult.unpaidDays;
                        const deductionDesc =
                            unpaidDays > 0
                                ? `Auto-calculated from ${unpaidDays} unpaid leave day(s)`
                                : 'Auto-calculated from leave records';

                        // Create payroll using existing method logic
                        const createResult = await this.createDraftAsync(
                            {
                                employeeId: employee.id,
                                payPeriodStart: dto.payPeriodStart,
                                payPeriodEnd: dto.payPeriodEnd,
                                currencyCode: dto.currencyCode,
                                overtimeHours,
                                bonus: 0,
                                deductions: leaveDeductions,
                                deductionName:
                                    leaveDeductions > 0
                                        ? 'Unpaid Leave'
                                        : undefined,
                                deductionDescription:
                                    leaveDeductions > 0
                                        ? deductionDesc
                                        : undefined,
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
                    } else {
                        // Create payroll with 0 values for manual entry if auto-calculate is false
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

    async getMePayslipsAsync(
        userId: string,
        year?: number,
    ): Promise<Result<MePayslipResponseDto>> {
        try {
            const employee = await this.prisma.client.employee.findUnique({
                where: { userId, isDeleted: false },
            });

            if (!employee) {
                return Result.fail('Employee profile not found');
            }

            const currentYear = year || new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);

            const payrolls = await this.prisma.client.payroll.findMany({
                where: {
                    employeeId: employee.id,
                    payPeriodStart: {
                        gte: startOfYear,
                        lte: endOfYear,
                    },
                    isDeleted: false,
                },
                include: {
                    items: { where: { isDeleted: false } },
                },
                orderBy: { payPeriodStart: 'desc' },
            });

            const records: MePayslipRecordDto[] = payrolls.map((p) => {
                const gross = p.basicSalary
                    .plus(p.overtimeHrs.times(p.overtimeRate))
                    .plus(p.bonus);

                let totalTax = new Decimal(0);
                for (const item of p.items) {
                    if (item.itemName === 'Tax') {
                        totalTax = totalTax.plus(item.amount);
                    }
                }

                const summary: MePayslipSummaryDto = {
                    gross_salary: new DecimalNumber(gross),
                    total_deductions: new DecimalNumber(
                        totalTax.plus(p.deductions),
                    ),
                    net_salary: new DecimalNumber(p.netSalary),
                };

                const monthName = p.payPeriodStart.toLocaleString('en-US', {
                    month: 'long',
                    year: 'numeric',
                });

                return {
                    id: p.id,
                    period: monthName,
                    period_start: p.payPeriodStart.toISOString().split('T')[0],
                    period_end: p.payPeriodEnd.toISOString().split('T')[0],
                    pay_date: p.paymentDate
                        ? p.paymentDate.toISOString().split('T')[0]
                        : null,
                    status: p.status.toLowerCase(),
                    summary,
                    pdf_url: `/api/payrolls/payslip/${p.id}`,
                };
            });

            // Calculate YTD
            let ytdGross = new Decimal(0);
            let ytdNet = new Decimal(0);
            let ytdTax = new Decimal(0);
            let ytdNssf = new Decimal(0);

            for (const p of payrolls) {
                const gross = p.basicSalary
                    .plus(p.overtimeHrs.times(p.overtimeRate))
                    .plus(p.bonus);
                ytdGross = ytdGross.plus(gross);
                ytdNet = ytdNet.plus(p.netSalary);

                for (const item of p.items) {
                    if (item.itemName === 'Tax') {
                        ytdTax = ytdTax.plus(item.amount);
                    }
                    if (item.itemName === 'NSSF') {
                        ytdNssf = ytdNssf.plus(item.amount);
                    }
                }
            }

            const ytdSummary: MePayslipYtdDto = {
                year: currentYear,
                total_gross: new DecimalNumber(ytdGross),
                total_tax: new DecimalNumber(ytdTax),
                total_nssf: new DecimalNumber(ytdNssf),
                total_net: new DecimalNumber(ytdNet),
            };

            return Result.ok({
                records,
                ytd_summary: ytdSummary,
            });
        } catch (error) {
            this.logger.error('Failed to fetch personal payslips', error);
            return Result.fail('Failed to fetch payslips');
        }
    }

    async getMyPayrollByIdAsync(
        userId: string,
        payrollId: string,
    ): Promise<Result<PayrollDto>> {
        try {
            const payroll = await this.prisma.client.payroll.findFirst({
                where: {
                    id: payrollId,
                    employee: { userId },
                    isDeleted: false,
                },
                include: {
                    items: {
                        where: { isDeleted: false },
                    },
                    taxCalculation: true,
                },
            });

            if (!payroll) {
                return Result.fail('Payroll not found or access denied');
            }

            return Result.ok(CommonMapper.mapToPayrollDto(payroll)!);
        } catch (error) {
            this.logger.error('Failed to fetch personal payroll', error);
            return Result.fail('Failed to fetch payroll');
        }
    }

    async downloadPayslipPdfAsync(
        id: string,
        userId: string,
    ): Promise<Result<{ buffer: Buffer; filename: string }>> {
        try {
            const payroll = await this.prisma.client.payroll.findFirst({
                where: {
                    id,
                    employee: { userId },
                    isDeleted: false,
                },
                include: {
                    employee: {
                        include: {
                            department: true,
                            position: true,
                        },
                    },
                    items: true,
                },
            });

            if (!payroll) {
                return Result.fail('Payslip not found');
            }

            const buffer = await this.generatePdfBuffer(payroll);
            const filename = `payslip_${payroll.payPeriodStart.toISOString().split('T')[0]}_${payroll.employee.employeeCode}.pdf`;

            return Result.ok({ buffer, filename });
        } catch (error) {
            this.logger.error('Failed to generate payslip PDF', error);
            return Result.fail('Failed to download payslip');
        }
    }

    private async generatePdfBuffer(payroll: PayslipPayroll): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', (err: Error) => reject(err));

                const periodStr = `${payroll.payPeriodStart.toLocaleDateString()} - ${payroll.payPeriodEnd.toLocaleDateString()}`;
                const employeeName = `${payroll.employee.firstname} ${payroll.employee.lastname}`;
                const department =
                    payroll.employee.department?.departmentName || 'N/A';
                const position = payroll.employee.position?.title || 'N/A';

                const earnings = payroll.items.filter(
                    (item) => item.itemType === 'EARNING',
                );
                const deductions = payroll.items.filter(
                    (item) => item.itemType === 'DEDUCTION',
                );

                const grossSalary = payroll.basicSalary
                    .plus(payroll.overtimeRate.times(payroll.overtimeHrs))
                    .plus(payroll.bonus);
                const totalTax = payroll.items
                    .filter((item) => item.itemName === 'Tax')
                    .reduce(
                        (acc, curr) => acc.add(curr.amount),
                        new Decimal(0),
                    );
                const totalDeductions = payroll.deductions.plus(totalTax);

                const colX = [50, 300, 450, 550];
                const rowHeight = 22;

                const drawRow = (
                    cols: (string | number)[],
                    options: {
                        bold?: boolean;
                        fill?: string;
                        align?: ('left' | 'right')[];
                    } = {},
                ) => {
                    const y = doc.y;
                    if (options.fill) {
                        doc.rect(50, y, 500, rowHeight).fill(options.fill);
                    }
                    doc.fillColor('black');
                    doc.font(
                        options.bold ? 'Helvetica-Bold' : 'Helvetica',
                    ).fontSize(10);
                    cols.forEach((text, i) => {
                        const align = options.align?.[i] || 'left';
                        doc.text(String(text), colX[i], y + 6, {
                            width: colX[i + 1] - colX[i] - 10,
                            align,
                        });
                    });
                    doc.y = y + rowHeight;
                };

                const drawInfoRow = (
                    leftLabel: string,
                    leftValue: string,
                    rightLabel: string,
                    rightValue: string,
                ) => {
                    const y = doc.y;
                    doc.font('Helvetica-Bold').fontSize(10);
                    doc.text(leftLabel, 50, y);
                    doc.font('Helvetica').text(leftValue, 130, y);
                    doc.font('Helvetica-Bold').text(rightLabel, 300, y);
                    doc.font('Helvetica').text(rightValue, 380, y);
                    doc.y = y + 18;
                };

                doc.font('Helvetica-Bold')
                    .fontSize(20)
                    .text('PAYSLIP', 50, doc.y, { align: 'center' });
                doc.moveDown(2);

                drawInfoRow(
                    'Employee:',
                    employeeName,
                    'Pay Period:',
                    periodStr,
                );
                drawInfoRow(
                    'ID:',
                    payroll.employee.employeeCode,
                    'Pay Date:',
                    payroll.paymentDate
                        ? payroll.paymentDate.toLocaleDateString()
                        : 'Pending',
                );
                drawInfoRow(
                    'Department:',
                    department,
                    'Status:',
                    payroll.status,
                );
                drawInfoRow('Position:', position, '', '');

                drawRow(['Item', 'Type', 'Amount'], {
                    bold: true,
                    fill: '#f0f0f0',
                });
                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

                earnings.forEach((item) => {
                    drawRow(
                        [
                            item.itemName,
                            'Earning',
                            Number(item.amount).toFixed(2),
                        ],
                        {
                            align: ['left', 'left', 'right'],
                        },
                    );
                });

                deductions.forEach((item) => {
                    doc.fillColor('red');
                    drawRow(
                        [
                            item.itemName,
                            'Deduction',
                            `(${Number(item.amount).toFixed(2)})`,
                        ],
                        {
                            align: ['left', 'left', 'right'],
                        },
                    );
                    doc.fillColor('black');
                });

                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(0.5);

                drawRow(['Gross Salary', '', Number(grossSalary).toFixed(2)], {
                    bold: true,
                    align: ['left', 'left', 'right'],
                });

                doc.fillColor('red');
                drawRow(
                    [
                        'Total Deductions',
                        '',
                        `(${Number(totalDeductions).toFixed(2)})`,
                    ],
                    {
                        bold: true,
                        align: ['left', 'left', 'right'],
                    },
                );
                doc.fillColor('black');

                doc.y += 5;
                drawRow(
                    [
                        'NET SALARY',
                        '',
                        `${payroll.currencyCode} ${Number(payroll.netSalary).toFixed(2)}`,
                    ],
                    {
                        bold: true,
                        fill: '#eeeeee',
                        align: ['left', 'left', 'right'],
                    },
                );

                doc.moveDown(3);
                doc.font('Helvetica-Oblique')
                    .fontSize(8)
                    .fillColor('gray')
                    .text(
                        'This is a computer-generated document. No signature is required.',
                        {
                            align: 'center',
                        },
                    );

                doc.end();
            } catch (err) {
                reject(
                    err instanceof Error
                        ? err
                        : new Error('PDF generation failed'),
                );
            }
        });
    }
}
