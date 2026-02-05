import { PrismaClient, Prisma } from '@prisma/client';


export async function seedPayrollRecords(prisma: PrismaClient) {
  console.log('--- Seeding Historical Payroll Records ---');

  // 1. Get Employees
  const employees = await prisma.employee.findMany({
    where: { isDeleted: false, status: 'ACTIVE' },
    include: { position: true }
  });

  if (employees.length === 0) {
    console.warn('No employees to seed payrolls for.');
    return;
  }

  // 2. Get Tax Brackets for calculation
  const currentYear = new Date().getFullYear();
  const brackets = await prisma.taxBracket.findMany({
    where: {
      countryCode: 'USA', // Matching payroll-seed.ts placeholder
      taxYear: currentYear
    },
    orderBy: { minAmount: 'desc' }
  });

  // 3. Define period (Last 6 months)
  const monthsToSeed = 6;
  const now = new Date();

  for (const employee of employees) {
    // Skip some employees to check "no data" states if needed, or seed all
    // For now, seed all to ensure data visibility

    const basicSalary = employee.salary || new Prisma.Decimal(2000); // Default if null

    for (let i = 0; i < monthsToSeed; i++) {
      // Calculate date for the i-th month back
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Skip if payroll already exists
      const exists = await prisma.payroll.findFirst({
        where: {
          employeeId: employee.id,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          isDeleted: false
        }
      });

      if (exists) continue;

      // Simple Calculation logic (mirroring service somewhat)
      // Variation: Random overtime
      const overtimeHours = new Prisma.Decimal(Math.floor(Math.random() * 10)); // 0-9 hours
      const hourlyRate = basicSalary.div(160);
      const overtimeRate = hourlyRate.mul(1.5);
      const overtimePay = overtimeRate.mul(overtimeHours);

      const bonus = new Prisma.Decimal(i === 0 ? 500 : 0); // Bonus only on current month for variety
      const grossIncome = basicSalary.plus(overtimePay).plus(bonus);

      // Tax Calculation
      let taxAmount = new Prisma.Decimal(0);
      let taxBracketId: string | null = null;
      let taxRateUsed = new Prisma.Decimal(0);

      // Find bracket
      const bracket = brackets.find(b =>
        grossIncome.gte(b.minAmount) && grossIncome.lt(b.maxAmount)
      );
      // Fallback for highest bracket if not found (though <999999 covers most)
      const activeBracket = bracket || brackets[0]; // Logic might be flawed if brackets sorted desc, but simplified for seed

      if (activeBracket) {
        taxAmount = grossIncome.mul(activeBracket.taxRate).minus(activeBracket.fixedAmount);
        if (taxAmount.lt(0)) taxAmount = new Prisma.Decimal(0);
        taxBracketId = activeBracket.id;
        taxRateUsed = activeBracket.taxRate;
      }

      const deductions = new Prisma.Decimal(0); // insurance etc placeholder
      const totalDeductions = taxAmount.plus(deductions);
      const netSalary = grossIncome.minus(totalDeductions);

      // Determine status (Past months = PAID, Current = PROCESSED or PENDING)
      let status = 'PAID';
      let paymentDate: Date | null = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 28);
      if (i === 0) {
        status = 'PROCESSED';
        paymentDate = null;
      }

      // Create Payroll
      const payroll = await prisma.payroll.create({
        data: {
          employeeId: employee.id,
          currencyCode: 'USD',
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          basicSalary,
          overtimeHrs: overtimeHours,
          overtimeRate: overtimeRate,
          bonus,
          deductions,
          netSalary,
          status,
          paymentDate,
          processedAt: status !== 'PENDING' ? paymentDate || new Date() : null,
        }
      });

      // Create Items
      const items = [
        {
          payrollId: payroll.id,
          currencyCode: 'USD',
          itemType: 'EARNING',
          itemName: 'Basic Salary',
          amount: basicSalary,
          description: 'Monthly base salary'
        }
      ];

      if (overtimePay.gt(0)) {
        items.push({
          payrollId: payroll.id,
          currencyCode: 'USD',
          itemType: 'EARNING',
          itemName: 'Overtime',
          amount: overtimePay,
          description: `${overtimeHours} hours @ ${overtimeRate.toFixed(2)}`
        });
      }

      if (bonus.gt(0)) {
        items.push({
          payrollId: payroll.id,
          currencyCode: 'USD',
          itemType: 'EARNING',
          itemName: 'Bonus',
          amount: bonus,
          description: 'Performance Bonus'
        });
      }

      if (taxAmount.gt(0)) {
        items.push({
          payrollId: payroll.id,
          currencyCode: 'USD',
          itemType: 'DEDUCTION',
          itemName: 'Tax',
          amount: taxAmount,
          description: `Tax Rate approx ${(Number(taxRateUsed) * 100).toFixed(0)}%`
        });
      }

      await prisma.payrollItems.createMany({ data: items });

      // Create Tax Calculation Snapshot
      if (taxBracketId) {
        await prisma.taxCalculation.create({
          data: {
            payrollId: payroll.id,
            employeeId: employee.id,
            taxBracketId: taxBracketId,
            taxPeriodStart: periodStart,
            taxPeriodEnd: periodEnd,
            grossIncome,
            taxableIncome: grossIncome,
            taxAmount,
            taxRateUsed
          }
        });
      }
    }
  }
  console.log(`Seeded payrolls for ${employees.length} employees over ${monthsToSeed} months.`);
}
