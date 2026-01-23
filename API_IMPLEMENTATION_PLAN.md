# HRMS API Implementation Plan

## Executive Summary

This document provides a comprehensive analysis of the HRMS API and a detailed implementation plan to address gaps, missing features, and improvements. The API is well-structured but requires enhancements in security, performance, completeness, and documentation.

**Total Issues Found:** 110  
**Critical (High Priority):** 30 issues  
**Important (Medium Priority):** 45 issues  
**Nice to Have (Low Priority):** 35 issues

---

## 1. Critical Issues (High Priority)

### 1.1 Security Vulnerabilities

#### Issue 1: Missing Rate Limiting

**Priority:** 🔴 HIGH  
**Module:** Auth  
**Impact:** Brute force attacks on login, spam on registration

**Fix:**

```bash
npm install @nestjs/throttler
```

```typescript
// src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 1 minute
                limit: 10, // 10 requests per minute
            },
        ]),
        // ... other modules
    ],
})
export class AppModule {}
```

```typescript
// src/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle(5, 60) // 5 requests per minute for login
async login(@Body() dto: LoginDto) {
  // ... implementation
}

@Post('register')
@Throttle(3, 60) // 3 requests per minute for registration
async register(@Body() dto: RegisterDto) {
  // ... implementation
}
```

**Files to Modify:**

- `src/app.module.ts` - Add ThrottlerModule
- `src/auth/auth.controller.ts` - Add rate limiting decorators
- `src/main.ts` - Add global throttler guard if needed

---

#### Issue 2: Missing Permission Checks

**Priority:** 🔴 HIGH  
**Module:** All (Employees, Leaves, Attendances, Payrolls, Users, Reports)  
**Impact:** Unauthorized access to sensitive data

**Fix:**

```typescript
// src/guards/self.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SelfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const userId = request.user.sub;
        const targetId = request.params.id;

        // Allow if user is accessing their own data or is ADMIN
        return userId === targetId || request.user.roles.includes('ADMIN');
    }
}
```

```typescript
// src/guards/manager.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ManagerGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user.sub;
        const targetId = request.params.id;

        // Allow if user is ADMIN
        if (request.user.roles.includes('ADMIN')) return true;

        // Check if target is subordinate
        const employee = await this.prisma.employee.findUnique({
            where: { id: targetId },
            select: { managerId: true },
        });

        if (!employee) return false;

        const manager = await this.prisma.employee.findUnique({
            where: { userId },
        });

        return employee.managerId === manager?.id;
    }
}
```

**Usage in Controllers:**

```typescript
// src/employees/employees.controller.ts
@Get(':id')
@UseGuards(SelfGuard)
@HttpCode(HttpStatus.OK)
async findOne(@Param('id') id: string) {
  // ... implementation
}

// src/leaves/leaves.controller.ts
@Patch(':id/status')
@UseGuards(ManagerGuard)
@HttpCode(HttpStatus.OK)
async updateStatus(
  @Param('id') id: string,
  @Body() dto: UpdateLeaveStatusDto,
) {
  // ... implementation
}
```

**Files to Create:**

- `src/guards/self.guard.ts`
- `src/guards/manager.guard.ts`
- `src/guards/permission.guard.ts` (optional for fine-grained permissions)

**Files to Modify:**

- `src/employees/employees.controller.ts` - Add SelfGuard
- `src/leaves/leaves.controller.ts` - Add ManagerGuard
- `src/attendances/attendances.controller.ts` - Add SelfGuard
- `src/payrolls/payrolls.controller.ts` - Add SelfGuard
- `src/users/users.controller.ts` - Add SelfGuard
- `src/reports/reports.controller.ts` - Add role-based guards

---

#### Issue 3: Missing Account Lockout

**Priority:** 🔴 HIGH  
**Module:** Auth  
**Impact:** Brute force attacks can succeed

**Fix:**

```typescript
// src/auth/auth.service.ts
async loginAsync(dto: LoginDto): Promise<Result<AuthResponseDto>> {
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    return Result.fail('Invalid credentials');
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockUntil = user.lockUntil;
    if (lockUntil && lockUntil > new Date()) {
      const minutesLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
      return Result.fail(`Account locked. Try again in ${minutesLeft} minutes`);
    }
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(dto.password, user.password);

  if (!isPasswordValid) {
    // Increment failed attempts
    const failedAttempts = (user.failedAttempts || 0) + 1;
    const isLocked = failedAttempts >= 5;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts,
        isLocked,
        lockUntil: isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null, // 15 minutes
      },
    });

    return Result.fail('Invalid credentials');
  }

  // Reset failed attempts and unlock if needed
  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      isLocked: false,
      lockUntil: null,
    },
  });

  // ... generate token and return
}
```

**Files to Modify:**

- `src/auth/auth.service.ts` - Add lockout logic
- `prisma/schema.prisma` - Add `failedAttempts`, `isLocked`, `lockUntil` to User model

---

### 1.2 Performance Issues

#### Issue 4: N+1 Query Problem

**Priority:** 🔴 HIGH  
**Module:** All  
**Impact:** Performance degradation with large datasets

**Fix:**

```typescript
// Instead of:
@Get()
async findAll() {
  const employees = await this.prisma.employee.findMany();
  const result = [];
  for (const employee of employees) {
    const department = await this.prisma.department.findUnique({
      where: { id: employee.departmentId },
    });
    result.push({ ...employee, department });
  }
  return result;
}

// Use:
@Get()
async findAll() {
  const employees = await this.prisma.employee.findMany({
    include: {
      department: true,
      position: true,
      manager: true,
    },
  });
  return employees;
}
```

**For complex queries, use DataLoader:**

```bash
npm install dataloader
```

```typescript
// src/common/loaders/employee.loader.ts
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service';

export class EmployeeLoader {
    constructor(private prisma: PrismaService) {}

    createDepartmentLoader() {
        return new DataLoader<string, any>(async (departmentIds: string[]) => {
            const departments = await this.prisma.department.findMany({
                where: { id: { in: [...departmentIds] } },
            });

            const departmentMap = new Map(departments.map((d) => [d.id, d]));
            return departmentIds.map((id) => departmentMap.get(id) || null);
        });
    }
}
```

**Files to Modify:**

- All service files - Use eager loading instead of lazy loading
- Add DataLoader for complex queries
- Review all `findMany` calls and add `include` where needed

---

#### Issue 5: Missing Pagination

**Priority:** 🔴 HIGH  
**Module:** Employees, Attendances, Payrolls, Users, TaxBrackets  
**Impact:** Scalability issues, memory problems

**Fix:**

```typescript
// src/common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    get skip(): number {
        return (this.page - 1) * this.limit;
    }
}
```

```typescript
// src/common/dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}
```

```typescript
// src/employees/employees.controller.ts
@Get()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get all employees (Paginated)' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
async findAll(
  @Query() pagination: PaginationDto,
) {
  const result = await this.employeesService.findAllPaginatedAsync(
    pagination.page,
    pagination.limit,
  );
  return result.getData();
}
```

```typescript
// src/employees/employees.service.ts
async findAllPaginatedAsync(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [employees, total] = await this.prisma.$transaction([
    this.prisma.employee.findMany({
      skip,
      take: limit,
      where: { isDeleted: false },
      include: {
        department: true,
        position: true,
        manager: true,
      },
    }),
    this.prisma.employee.count({ where: { isDeleted: false } }),
  ]);

  return Result.ok({
    data: employees,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrevious: skip > 0,
    },
  });
}
```

**Files to Create:**

- `src/common/dto/pagination.dto.ts`
- `src/common/dto/paginated-response.dto.ts`

**Files to Modify:**

- `src/employees/employees.controller.ts` - Add pagination
- `src/employees/employees.service.ts` - Add pagination logic
- `src/attendances/attendances.controller.ts` - Add pagination
- `src/attendances/attendances.service.ts` - Add pagination logic
- `src/payrolls/payrolls.controller.ts` - Add pagination
- `src/payrolls/payrolls.service.ts` - Add pagination logic
- `src/users/users.controller.ts` - Add pagination
- `src/users/users.service.ts` - Add pagination logic
- `src/tax-brackets/tax-brackets.controller.ts` - Add pagination
- `src/tax-brackets/tax-brackets.service.ts` - Add pagination logic

---

#### Issue 6: Missing Indexes

**Priority:** 🔴 HIGH  
**Module:** Schema  
**Impact:** Slow query performance

**Fix:**

```prisma
// prisma/schema.prisma

// Add to Department model
model Department {
  id               String    @id @default(uuid())
  departmentName   String    @db.VarChar(150)
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  performBy        String?
  performer        User?     @relation(fields: [performBy], references: [id])
  employees        Employee[]

  @@index([departmentName])
  @@index([isActive, isDeleted])
  @@index([createdAt])
  @@index([updatedAt])
}

// Add to Employee model
model Employee {
  id               String    @id @default(uuid())
  userId           String?   @unique
  departmentId     String
  positionId       String
  managerId        String?
  shiftId          String?
  employeeCode     String    @unique @db.VarChar(15)
  hireDate         DateTime
  firstname        String    @db.VarChar(70)
  lastname         String    @db.VarChar(70)
  gender           Int       // 0: male, 1: female, 2: unknown
  dob              DateTime
  address          String?   @db.Text
  phone            String?   @db.VarChar(20)
  profileImage     String?
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  performBy        String?
  performer        User?     @relation(fields: [performBy], references: [id])

  // Relations
  user             User?     @relation(fields: [userId], references: [id])
  department       Department @relation(fields: [departmentId], references: [id])
  position         EmployeePosition @relation(fields: [positionId], references: [id])
  manager          Employee? @relation("EmployeeToEmployee", fields: [managerId], references: [id])
  shift            Shift?    @relation(fields: [shiftId], references: [id])
  subordinates     Employee[] @relation("EmployeeToEmployee")
  taxConfig        EmployeeTaxConfig?
  attendances      Attendance[]
  leaveRequests    LeaveRequest[] @relation("LeaveRequestToEmployee")
  approvedLeaveRequests LeaveRequest[] @relation("LeaveRequestToApprover")
  payrolls         Payroll[]
  taxCalculations  TaxCalculation[]
  leaveBalances    LeaveBalance[]

  @@index([departmentId])
  @@index([positionId])
  @@index([managerId])
  @@index([shiftId])  // NEW
  @@index([lastname])
  @@index([employeeCode])
  @@index([isActive, isDeleted])
  @@index([createdAt])
  @@index([updatedAt])
}

// Add to Attendance model
model Attendance {
  id             String    @id @default(uuid())
  employeeId     String
  status         String    @db.VarChar(20)
  date           DateTime
  checkInTime    DateTime?
  checkOutTime   DateTime?
  isActive       Boolean   @default(true)
  isDeleted      Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  performBy      String?
  performer      User?     @relation(fields: [performBy], references: [id])
  employee       Employee  @relation(fields: [employeeId], references: [id])

  @@index([employeeId])
  @@index([date])
  @@index([employeeId, date])
  @@index([status])  // NEW
  @@index([isActive, isDeleted])
  @@index([createdAt])
  @@index([updatedAt])
}

// Add to LeaveBalance model
model LeaveBalance {
  id           String    @id @default(uuid())
  employeeId   String
  leaveType    String    @db.VarChar(50)
  year         Int
  totalDays    Decimal   @db.Decimal(5, 2)
  usedDays     Decimal   @db.Decimal(5, 2)
  pendingDays  Decimal   @db.Decimal(5, 2)
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  performBy    String?
  performer    User?     @relation(fields: [performBy], references: [id])
  employee     Employee  @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, leaveType, year])
  @@index([employeeId])  // NEW
  @@index([leaveType])   // NEW
  @@index([year])        // NEW
  @@index([isActive, isDeleted])
  @@index([createdAt])
  @@index([updatedAt])
}

// Add to TaxBracket model
model TaxBracket {
  id             String    @id @default(uuid())
  currencyCode   String    @db.VarChar(5)
  countryCode    String    @db.VarChar(5)
  taxYear        Int
  bracketName    String    @db.VarChar(100)
  minAmount      Decimal   @db.Decimal(12, 2)
  maxAmount      Decimal   @db.Decimal(12, 2)
  taxRate        Decimal   @db.Decimal(5, 4)
  fixedAmount    Decimal   @db.Decimal(12, 2)
  isActive       Boolean   @default(true)
  isDeleted      Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  performBy      String?
  performer      User?     @relation(fields: [performBy], references: [id])
  taxCalculations TaxCalculation[]

  @@unique([currencyCode, countryCode, taxYear, bracketName])
  @@index([currencyCode])  // NEW
  @@index([countryCode])
  @@index([taxYear])       // NEW
  @@index([isActive, isDeleted])
  @@index([createdAt])
  @@index([updatedAt])
}

// Add to all other models
model EmployeePosition {
  id               String    @id @default(uuid())
  title            String    @db.VarChar(100)
  description      String?   @db.Text
  salaryRangeMin   Decimal   @db.Decimal(10, 2)
  salaryRangeMax   Decimal   @db.Decimal(10, 2)
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  performBy        String?
  performer        User?     @relation(fields: [performBy], references: [id])
  employees        Employee[]

  @@index([title])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model Shift {
  id               String    @id @default(uuid())
  name             String    @db.VarChar(50)
  startTime        DateTime
  endTime          DateTime
  workDays         String    @db.VarChar(20)
  gracePeriodMins  Int
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  performBy        String?
  performer        User?     @relation(fields: [performBy], references: [id])
  employees        Employee[]

  @@index([name])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model PublicHoliday {
  id           String    @id @default(uuid())
  name         String    @db.VarChar(100)
  date         DateTime
  isRecurring  Boolean
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  performBy    String?
  performer    User?     @relation(fields: [performBy], references: [id])

  @@index([date])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model Currency {
  id         String    @id @default(uuid())
  code       String    @unique @db.VarChar(5)
  name       String    @db.VarChar(50)
  symbol     String    @db.VarChar(5)
  country    String    @db.VarChar(15)
  isActive   Boolean   @default(true)
  isDeleted  Boolean   @default(false)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
  performBy  String?
  performer  User?     @relation(fields: [performBy], references: [id])

  @@index([code])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model ExchangeRate {
  id                 String    @id @default(uuid())
  fromCurrencyCode   String    @db.VarChar(5)
  toCurrencyCode     String    @db.VarChar(5)
  rate               Decimal   @db.Decimal(10, 6)
  date               DateTime
  source             String?   @db.VarChar(100)
  isActive           Boolean   @default(true)
  isDeleted          Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  performBy          String?
  performer          User?     @relation(fields: [performBy], references: [id])

  @@unique([fromCurrencyCode, toCurrencyCode, date])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model Payroll {
  id                 String    @id @default(uuid())
  employeeId         String
  currencyCode       String    @db.VarChar(5)
  baseCurrencyCode   String?   @db.VarChar(5)
  payPeriodStart     DateTime
  payPeriodEnd       DateTime
  paymentDate        DateTime?
  basicSalary        Decimal   @db.Decimal(12, 2)
  overtimeHrs        Decimal   @db.Decimal(4, 2)
  overtimeRate       Decimal   @db.Decimal(12, 2)
  bonus              Decimal   @db.Decimal(12, 2)
  deductions         Decimal   @db.Decimal(12, 2)
  netSalary          Decimal   @db.Decimal(12, 2)
  exchangeRate       Decimal   @db.Decimal(10, 6)
  baseCurrencyAmount Decimal   @db.Decimal(12, 2)
  status             String    @db.VarChar(20)
  processedAt        DateTime?
  isActive           Boolean   @default(true)
  isDeleted          Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  performBy          String?
  performer          User?     @relation(fields: [performBy], references: [id])
  employee           Employee  @relation(fields: [employeeId], references: [id])
  items              PayrollItems[]
  taxCalculation     TaxCalculation?

  @@index([employeeId])
  @@index([payPeriodStart, payPeriodEnd])
  @@index([status])
  @@index([currencyCode])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model PayrollItems {
  id           String    @id @default(uuid())
  payrollId    String
  currencyCode String?   @db.VarChar(5)
  itemType     String    @db.VarChar(50)
  itemName     String    @db.VarChar(100)
  amount       Decimal   @db.Decimal(12, 2)
  description  String?   @db.Text
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  performBy    String?
  performer    User?     @relation(fields: [performBy], references: [id])
  payroll      Payroll   @relation(fields: [payrollId], references: [id])

  @@index([payrollId])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model EmployeeTaxConfig {
  id           String    @id @default(uuid())
  employeeId   String    @unique
  taxCountry   String    @db.VarChar(5)
  taxCode      String    @db.VarChar(50)
  taxExempt    Boolean
  isActive     Boolean   @default(true)
  isDeleted    Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  performBy    String?
  performer    User?     @relation(fields: [performBy], references: [id])
  employee     Employee  @relation(fields: [employeeId], references: [id])

  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model TaxCalculation {
  id               String    @id @default(uuid())
  payrollId        String    @unique
  employeeId       String
  taxBracketId     String
  taxPeriodStart   DateTime
  taxPeriodEnd     DateTime
  grossIncome      Decimal   @db.Decimal(12, 2)
  taxableIncome    Decimal   @db.Decimal(12, 2)
  taxAmount        Decimal   @db.Decimal(12, 2)
  taxRateUsed      Decimal   @db.Decimal(5, 4)
  isActive         Boolean   @default(true)
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  performBy        String?
  performer        User?     @relation(fields: [performBy], references: [id])
  payroll          Payroll   @relation(fields: [payrollId], references: [id])
  employee         Employee  @relation(fields: [employeeId], references: [id])
  taxBracket       TaxBracket @relation(fields: [taxBracketId], references: [id])

  @@index([employeeId])
  @@index([taxBracketId])
  @@index([taxPeriodStart, taxPeriodEnd])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model CompanySettings {
  id                   String    @id @default(uuid())
  name                 String    @db.VarChar(255)
  baseCurrencyCode     String    @db.VarChar(5)
  fiscalYearStartMonth Int
  isActive             Boolean   @default(true)
  isDeleted            Boolean   @default(false)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?
  performBy            String?
  performer            User?     @relation(fields: [performBy], references: [id])

  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model AuditLog {
  id         String    @id @default(uuid())
  userId     String
  action     String    @db.VarChar(100)
  tableName  String    @db.VarChar(100)
  recordId   String    @db.VarChar(150)
  oldValue   Json?
  newValue   Json?
  timestamp  DateTime
  isActive   Boolean   @default(true)
  isDeleted  Boolean   @default(false)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
  performer  User?     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([tableName, recordId])
  @@index([timestamp])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}

model Slug {
  id          String    @id @default(uuid())
  slug        String    @unique @db.VarChar(50)
  title       String    @db.VarChar(50)
  description String?   @db.Text
  data        Json?
  status      String    @db.VarChar(5)
  createdBy   String
  updatedBy   String?
  isActive    Boolean   @default(true)
  isDeleted   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  creator     User?     @relation(fields: [createdBy], references: [id])
  updater     User?     @relation(fields: [updatedBy], references: [id])

  @@index([status])
  @@index([isActive, isDeleted])  // NEW
  @@index([createdAt])
  @@index([updatedAt])
}
```

**Files to Modify:**

- `prisma/schema.prisma` - Add all missing indexes

---

### 1.3 Error Handling Issues

#### Issue 7: Generic Error Usage

**Priority:** 🔴 HIGH  
**Module:** Shifts, Payrolls, Currencies, TaxBrackets, PublicHolidays  
**Impact:** Poor error messages, inconsistent error responses

**Fix:**

```typescript
// src/common/exceptions/business-error.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessError extends HttpException {
    constructor(message: string, code: string = 'BUSINESS_ERROR') {
        super(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
```

```typescript
// src/common/exceptions/not-found.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundException extends HttpException {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} with id ${id} not found`
            : `${resource} not found`;
        super(
            {
                statusCode: HttpStatus.NOT_FOUND,
                code: 'NOT_FOUND',
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.NOT_FOUND,
        );
    }
}
```

```typescript
// src/common/exceptions/conflict.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class ConflictException extends HttpException {
    constructor(message: string, code: string = 'CONFLICT') {
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.CONFLICT,
        );
    }
}
```

**Update Shifts Service:**

```typescript
// src/shifts/shifts.service.ts
import { BusinessError } from '../common/exceptions/business-error.exception';
import { NotFoundException } from '../common/exceptions/not-found.exception';

async updateAsync(id: string, dto: UpdateShiftDto, performerId: string) {
  const existing = await this.prisma.shift.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new NotFoundException('Shift', id);
  }

  // Validate time
  if (new Date(dto.endTime) <= new Date(dto.startTime)) {
    throw new BusinessError('End time must be after start time', 'INVALID_TIME_RANGE');
  }

  const updated = await this.prisma.shift.update({
    where: { id },
    data: {
      ...dto,
      performBy: performerId,
    },
  });

  return Result.ok(updated);
}
```

**Files to Create:**

- `src/common/exceptions/business-error.exception.ts`
- `src/common/exceptions/not-found.exception.ts`
- `src/common/exceptions/conflict.exception.ts`
- `src/common/exceptions/unauthorized.exception.ts`

**Files to Modify:**

- `src/shifts/shifts.service.ts` - Replace generic Error with proper exceptions
- `src/payrolls/payrolls.service.ts` - Replace generic Error with proper exceptions
- `src/currencies/currencies.service.ts` - Replace generic Error with proper exceptions
- `src/tax-brackets/tax-brackets.service.ts` - Replace generic Error with proper exceptions
- `src/public-holidays/public-holidays.service.ts` - Replace generic Error with proper exceptions

---

#### Issue 8: Missing Prisma Exception Filter

**Priority:** 🔴 HIGH  
**Module:** All  
**Impact:** Poor error messages for database errors

**Fix:**

```typescript
// src/filters/prisma-exception.filter.ts
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let statusCode = HttpStatus.BAD_REQUEST;
        let message = 'Database error';
        let code = 'DATABASE_ERROR';

        switch (exception.code) {
            case 'P2002':
                statusCode = HttpStatus.CONFLICT;
                message = 'Unique constraint violation';
                code = 'UNIQUE_CONSTRAINT_VIOLATION';
                break;
            case 'P2025':
                statusCode = HttpStatus.NOT_FOUND;
                message = 'Record not found';
                code = 'RECORD_NOT_FOUND';
                break;
            case 'P2003':
                statusCode = HttpStatus.BAD_REQUEST;
                message = 'Foreign key constraint violation';
                code = 'FOREIGN_KEY_VIOLATION';
                break;
            case 'P2023':
                statusCode = HttpStatus.BAD_REQUEST;
                message = 'Inconsistent column data';
                code = 'INCONSISTENT_DATA';
                break;
            default:
                statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Database error occurred';
                code = 'DATABASE_ERROR';
        }

        response.status(statusCode).json({
            statusCode,
            code,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
```

```typescript
// src/main.ts
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ... other setup

    app.useGlobalFilters(new PrismaExceptionFilter());

    await app.listen(process.env.PORT || 3001);
}
```

**Files to Create:**

- `src/filters/prisma-exception.filter.ts`

**Files to Modify:**

- `src/main.ts` - Register PrismaExceptionFilter

---

#### Issue 9: Missing Error Codes

**Priority:** 🔴 HIGH  
**Module:** All  
**Impact:** Difficult for clients to handle errors programmatically

**Fix:**

```typescript
// src/common/enums/error-codes.enum.ts
export enum ErrorCode {
    // Validation Errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',

    // Authentication Errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    INVALID_TOKEN = 'INVALID_TOKEN',

    // Resource Errors
    NOT_FOUND = 'NOT_FOUND',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

    // Business Logic Errors
    BUSINESS_ERROR = 'BUSINESS_ERROR',
    CONFLICT = 'CONFLICT',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    INVALID_STATE = 'INVALID_STATE',

    // Database Errors
    DATABASE_ERROR = 'DATABASE_ERROR',
    UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
    FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',

    // Permission Errors
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
    SELF_ACCESS_REQUIRED = 'SELF_ACCESS_REQUIRED',

    // Rate Limiting
    RATE_LIMITED = 'RATE_LIMITED',

    // Business Specific
    LEAVE_BALANCE_INSUFFICIENT = 'LEAVE_BALANCE_INSUFFICIENT',
    PAYROLL_ALREADY_EXISTS = 'PAYROLL_ALREADY_EXISTS',
    INVALID_LEAVE_STATUS = 'INVALID_LEAVE_STATUS',
    MANAGER_HIERARCHY_ERROR = 'MANAGER_HIERARCHY_ERROR',
    HIRE_DATE_FUTURE = 'HIRE_DATE_FUTURE',
    PAYROLL_PERIOD_OVERLAP = 'PAYROLL_PERIOD_OVERLAP',
    INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
}
```

**Update Exception Classes:**

```typescript
// src/common/exceptions/business-error.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export class BusinessError extends HttpException {
    constructor(message: string, code: ErrorCode = ErrorCode.BUSINESS_ERROR) {
        super(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
```

**Files to Create:**

- `src/common/enums/error-codes.enum.ts`

**Files to Modify:**

- `src/common/exceptions/business-error.exception.ts`
- `src/common/exceptions/not-found.exception.ts`
- `src/common/exceptions/conflict.exception.ts`
- `src/common/exceptions/unauthorized.exception.ts`
- `src/filters/http-exception.filter.ts` - Add error codes to response

---

### 1.4 Missing CRUD Operations

#### Issue 10: Missing Update Operations

**Priority:** 🔴 HIGH  
**Module:** Shifts, Attendances, Payrolls  
**Impact:** Incomplete CRUD, users cannot update records

**Fix:**

```typescript
// src/shifts/dto/update-shift.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsTime,
    IsNumber,
    Matches,
} from 'class-validator';

export class UpdateShiftDto {
    @ApiPropertyOptional({ example: 'Morning Shift' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '09:00:00' })
    @IsOptional()
    @IsTime()
    startTime?: string;

    @ApiPropertyOptional({ example: '17:00:00' })
    @IsOptional()
    @IsTime()
    endTime?: string;

    @ApiPropertyOptional({ example: '1,2,3,4,5' })
    @IsOptional()
    @IsString()
    @Matches(/^(\d+,)*\d+$/, {
        message: 'Work days must be comma-separated numbers (1-7)',
    })
    workDays?: string;

    @ApiPropertyOptional({ example: 15 })
    @IsOptional()
    @IsNumber()
    gracePeriodMins?: number;
}
```

```typescript
// src/shifts/shifts.controller.ts
@Patch(':id')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Update shift' })
@ApiParam({ name: 'id', description: 'Shift ID' })
@ApiBody({ type: UpdateShiftDto })
@ApiResponse({ status: 200, description: 'Shift updated successfully' })
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({ status: 404, description: 'Shift not found' })
async update(
  @Param('id') id: string,
  @Body() dto: UpdateShiftDto,
  @CurrentUser('sub') userId: string,
) {
  const result = await this.shiftsService.updateAsync(id, dto, userId);
  if (!result.isSuccess) throw new BadRequestException(result.error);
  return result.getData();
}
```

```typescript
// src/shifts/shifts.service.ts
async updateAsync(id: string, dto: UpdateShiftDto, performerId: string) {
  const existing = await this.prisma.shift.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return Result.fail('Shift not found');
  }

  // Validate time range
  if (dto.startTime && dto.endTime) {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      return Result.fail('End time must be after start time');
    }
  }

  const updated = await this.prisma.shift.update({
    where: { id },
    data: {
      ...dto,
      performBy: performerId,
    },
  });

  return Result.ok(updated);
}
```

**For Attendances:**

```typescript
// src/attendances/dto/update-attendance.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDate, IsTime } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
    @ApiPropertyOptional({ enum: AttendanceStatus })
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @ApiPropertyOptional({ example: '2026-01-22' })
    @IsOptional()
    @IsDate()
    date?: Date;

    @ApiPropertyOptional({ example: '09:00:00' })
    @IsOptional()
    @IsTime()
    checkInTime?: string;

    @ApiPropertyOptional({ example: '17:00:00' })
    @IsOptional()
    @IsTime()
    checkOutTime?: string;
}
```

```typescript
// src/attendances/attendances.controller.ts
@Patch(':id')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Update attendance' })
@ApiResponse({ status: 200, description: 'Attendance updated' })
async update(
  @Param('id') id: string,
  @Body() dto: UpdateAttendanceDto,
  @CurrentUser('sub') userId: string,
) {
  const result = await this.attendancesService.updateAsync(id, dto, userId);
  if (!result.isSuccess) throw new BadRequestException(result.error);
  return result.getData();
}

@Delete(':id')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Delete attendance (soft delete)' })
@ApiResponse({ status: 200, description: 'Attendance deleted' })
async delete(
  @Param('id') id: string,
  @CurrentUser('sub') userId: string,
) {
  const result = await this.attendancesService.deleteAsync(id, userId);
  if (!result.isSuccess) throw new BadRequestException(result.error);
  return { message: 'Attendance deleted successfully' };
}
```

**For Payrolls:**

```typescript
// src/payrolls/dto/update-payroll.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDate, IsNumber, Min, Max } from 'class-validator';

export class UpdatePayrollDto {
    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDate()
    payPeriodStart?: Date;

    @ApiPropertyOptional({ example: '2026-01-31' })
    @IsOptional()
    @IsDate()
    payPeriodEnd?: Date;

    @ApiPropertyOptional({ example: '2026-02-05' })
    @IsOptional()
    @IsDate()
    paymentDate?: Date;

    @ApiPropertyOptional({ example: 2500.0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    basicSalary?: number;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    overtimeHrs?: number;

    @ApiPropertyOptional({ example: 23.44 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    overtimeRate?: number;

    @ApiPropertyOptional({ example: 500.0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    bonus?: number;

    @ApiPropertyOptional({ example: 100.0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    deductions?: number;
}
```

```typescript
// src/payrolls/payrolls.controller.ts
@Patch(':id')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Update pending payroll' })
@ApiResponse({ status: 200, description: 'Payroll updated' })
@ApiResponse({ status: 400, description: 'Cannot update processed payroll' })
async update(
  @Param('id') id: string,
  @Body() dto: UpdatePayrollDto,
  @CurrentUser('sub') userId: string,
) {
  const result = await this.payrollsService.updateAsync(id, dto, userId);
  if (!result.isSuccess) throw new BadRequestException(result.error);
  return result.getData();
}
```

```typescript
// src/payrolls/payrolls.service.ts
async updateAsync(id: string, dto: UpdatePayrollDto, performerId: string) {
  const existing = await this.prisma.payroll.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return Result.fail('Payroll not found');
  }

  if (existing.status !== 'PENDING') {
    return Result.fail('Only pending payrolls can be updated');
  }

  // Validate date range
  if (dto.payPeriodStart && dto.payPeriodEnd) {
    if (new Date(dto.payPeriodEnd) <= new Date(dto.payPeriodStart)) {
      return Result.fail('Pay period end must be after start');
    }
  }

  const updated = await this.prisma.payroll.update({
    where: { id },
    data: {
      ...dto,
      performBy: performerId,
    },
  });

  return Result.ok(updated);
}
```

**Files to Create:**

- `src/shifts/dto/update-shift.dto.ts`
- `src/attendances/dto/update-attendance.dto.ts`
- `src/attendances/dto/delete-attendance.dto.ts`
- `src/payrolls/dto/update-payroll.dto.ts`

**Files to Modify:**

- `src/shifts/shifts.controller.ts` - Add PATCH endpoint
- `src/shifts/shifts.service.ts` - Add updateAsync method
- `src/attendances/attendances.controller.ts` - Add PATCH and DELETE endpoints
- `src/attendances/attendances.service.ts` - Add updateAsync and deleteAsync methods
- `src/payrolls/payrolls.controller.ts` - Add PATCH endpoint
- `src/payrolls/payrolls.service.ts` - Add updateAsync method

---

## 2. Important Issues (Medium Priority)

### 2.1 Business Logic Gaps

#### Issue 11: Missing Business Validations

**Priority:** 🟡 MEDIUM  
**Module:** Employees, Leaves, Payrolls, Shifts, TaxBrackets  
**Impact:** Data quality issues

**Fix:**

```typescript
// src/employees/employees.service.ts
async createAsync(dto: EmployeeCreateDto, performerId: string) {
  // Check for circular manager reference
  if (dto.managerId === dto.id) {
    return Result.fail('Employee cannot be their own manager');
  }

  // Check hire date is not in future
  const hireDate = new Date(dto.hireDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (hireDate > today) {
    return Result.fail('Hire date cannot be in the future');
  }

  // Check if employee code already exists
  const existingCode = await this.prisma.employee.findUnique({
    where: { employeeCode: dto.employeeCode },
  });

  if (existingCode) {
    return Result.fail('Employee code already exists');
  }

  // ... rest of implementation
}
```

```typescript
// src/leaves/leaves.service.ts
async createAsync(dto: LeaveRequestCreateDto, performerId?: string) {
  // Get employee
  const employee = await this.prisma.employee.findUnique({
    where: { id: dto.employeeId },
  });

  if (!employee) {
    return Result.fail('Employee not found');
  }

  // Check date range
  const startDate = new Date(dto.startDate);
  const endDate = new Date(dto.endDate);

  if (endDate < startDate) {
    return Result.fail('End date must be after start date');
  }

  // Check for public holidays
  const publicHolidays = await this.prisma.publicHoliday.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      isDeleted: false,
    },
  });

  // Calculate business days (excluding weekends and public holidays)
  const leaveDays = this.calculateBusinessDays(startDate, endDate, publicHolidays);

  // Check leave balance
  const balance = await this.prisma.leaveBalance.findFirst({
    where: {
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      year: startDate.getFullYear(),
      isDeleted: false,
    },
  });

  if (!balance) {
    return Result.fail('No leave balance found for this leave type');
  }

  const availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
  if (leaveDays > availableDays) {
    return Result.fail(`Insufficient leave balance. Available: ${availableDays} days`);
  }

  // ... rest of implementation
}

private calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  publicHolidays: PublicHoliday[],
): number {
  let days = 0;
  const holidayDates = publicHolidays.map(h => h.date.toDateString());

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(current.toDateString());

    if (!isWeekend && !isHoliday) {
      days++;
    }

    current.setDate(current.getDate() + 1);
  }

  return days;
}
```

```typescript
// src/payrolls/payrolls.service.ts
async createDraftAsync(dto: ProcessPayrollDto, performBy: string) {
  // Check for existing payroll in period
  const existing = await this.prisma.payroll.findFirst({
    where: {
      employeeId: dto.employeeId,
      payPeriodStart: { lte: dto.payPeriodEnd },
      payPeriodEnd: { gte: dto.payPeriodStart },
      isDeleted: false,
    },
  });

  if (existing) {
    return Result.fail('Payroll already exists for this period');
  }

  // Validate date range
  if (new Date(dto.payPeriodEnd) <= new Date(dto.payPeriodStart)) {
    return Result.fail('Pay period end must be after start');
  }

  // Validate overtime hours
  if (dto.overtimeHrs < 0) {
    return Result.fail('Overtime hours cannot be negative');
  }

  // Validate bonus
  if (dto.bonus < 0) {
    return Result.fail('Bonus cannot be negative');
  }

  // Validate deductions
  if (dto.deductions < 0) {
    return Result.fail('Deductions cannot be negative');
  }

  // ... rest of implementation
}
```

```typescript
// src/shifts/shifts.service.ts
async createAsync(dto: CreateShiftDto, performerId: string) {
  // Validate time range
  if (new Date(dto.endTime) <= new Date(dto.startTime)) {
    return Result.fail('End time must be after start time');
  }

  // Validate work days format
  const workDays = dto.workDays.split(',').map(d => parseInt(d.trim()));
  const validDays = workDays.every(d => d >= 1 && d <= 7);

  if (!validDays) {
    return Result.fail('Work days must be numbers between 1 and 7');
  }

  // ... rest of implementation
}
```

```typescript
// src/tax-brackets/tax-brackets.service.ts
async createAsync(dto: CreateTaxBracketDto, performerId: string) {
  // Validate amount range
  if (dto.maxAmount <= dto.minAmount) {
    return Result.fail('Max amount must be greater than min amount');
  }

  // Validate tax rate
  if (dto.taxRate < 0 || dto.taxRate > 1) {
    return Result.fail('Tax rate must be between 0 and 1');
  }

  // ... rest of implementation
}
```

**Files to Modify:**

- `src/employees/employees.service.ts` - Add validations
- `src/leaves/leaves.service.ts` - Add validations
- `src/payrolls/payrolls.service.ts` - Add validations
- `src/shifts/shifts.service.ts` - Add validations
- `src/tax-brackets/tax-brackets.service.ts` - Add validations

---

#### Issue 12: Missing Leave Balance Logic Improvements

**Priority:** 🟡 MEDIUM  
**Module:** Leaves  
**Impact:** Inaccurate leave calculations

**Fix:**

```typescript
// src/leaves/leaves.service.ts
async createAsync(dto: LeaveRequestCreateDto, performerId?: string) {
  // ... existing validations

  // Check for overlapping leaves
  const overlappingLeaves = await this.prisma.leaveRequest.findMany({
    where: {
      employeeId: dto.employeeId,
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
      status: { in: ['PENDING', 'APPROVED'] },
      isDeleted: false,
    },
  });

  if (overlappingLeaves.length > 0) {
    return Result.fail('Leave request overlaps with existing leave');
  }

  // Calculate leave days excluding weekends and public holidays
  const leaveDays = this.calculateBusinessDays(startDate, endDate, publicHolidays);

  // Check if employee is tax exempt (for payroll calculation)
  const taxConfig = await this.prisma.employeeTaxConfig.findUnique({
    where: { employeeId: dto.employeeId },
  });

  // Get or create leave balance
  let balance = await this.prisma.leaveBalance.findFirst({
    where: {
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      year: startDate.getFullYear(),
      isDeleted: false,
    },
  });

  if (!balance) {
    // Auto-create balance with 0 if doesn't exist
    balance = await this.prisma.leaveBalance.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        year: startDate.getFullYear(),
        totalDays: 0,
        usedDays: 0,
        pendingDays: 0,
        performBy: performerId,
      },
    });
  }

  const availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
  if (leaveDays > availableDays) {
    return Result.fail(`Insufficient leave balance. Available: ${availableDays} days`);
  }

  // Update pending days
  await this.prisma.leaveBalance.update({
    where: { id: balance.id },
    data: {
      pendingDays: { increment: leaveDays },
      performBy: performerId,
    },
  });

  // ... create leave request
}
```

```typescript
// src/leaves/leaves.service.ts
async updateStatusAsync(
  id: string,
  dto: UpdateLeaveStatusDto,
  performerId: string,
) {
  const leave = await this.prisma.leaveRequest.findUnique({
    where: { id, isDeleted: false },
  });

  if (!leave) {
    return Result.fail('Leave request not found');
  }

  // Get balance
  const balance = await this.prisma.leaveBalance.findFirst({
    where: {
      employeeId: leave.employeeId,
      leaveType: leave.leaveType,
      year: leave.startDate.getFullYear(),
      isDeleted: false,
    },
  });

  if (!balance) {
    return Result.fail('Leave balance not found');
  }

  const leaveDays = this.calculateBusinessDays(
    leave.startDate,
    leave.endDate,
    [], // Should fetch public holidays
  );

  if (dto.status === 'APPROVED') {
    // Move from pending to used
    await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        pendingDays: { decrement: leaveDays },
        usedDays: { increment: leaveDays },
        performBy: performerId,
      },
    });
  } else if (dto.status === 'REJECTED' || dto.status === 'CANCELED') {
    // Remove from pending
    await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        pendingDays: { decrement: leaveDays },
        performBy: performerId,
      },
    });
  }

  // ... update leave status
}
```

**Files to Modify:**

- `src/leaves/leaves.service.ts` - Add overlap detection, improve balance logic
- `src/leaves/leaves.controller.ts` - Add overlap validation

---

#### Issue 13: Missing Payroll Overlap Check

**Priority:** 🟡 MEDIUM  
**Module:** Payrolls  
**Impact:** Duplicate payrolls for same period

**Fix:**

```typescript
// src/payrolls/payrolls.service.ts
async createDraftAsync(dto: ProcessPayrollDto, performBy: string) {
  // Check for existing payroll in period (already added in Issue 11)
  const existing = await this.prisma.payroll.findFirst({
    where: {
      employeeId: dto.employeeId,
      payPeriodStart: { lte: dto.payPeriodEnd },
      payPeriodEnd: { gte: dto.payPeriodStart },
      isDeleted: false,
    },
  });

  if (existing) {
    return Result.fail('Payroll already exists for this period');
  }

  // Validate overtime with attendance
  if (dto.overtimeHrs > 0) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: dto.employeeId,
        date: { gte: dto.payPeriodStart, lte: dto.payPeriodEnd },
        status: 'OVERTIME',
        isDeleted: false,
      },
    });

    const totalOvertime = attendances.reduce((sum, att) => {
      if (att.checkInTime && att.checkOutTime) {
        const hours = (att.checkOutTime.getTime() - att.checkInTime.getTime()) / (1000 * 60 * 60);
        return sum + Math.max(0, hours - 8); // Assuming 8-hour shift
      }
      return sum;
    }, 0);

    if (dto.overtimeHrs > totalOvertime) {
      return Result.fail(`Overtime hours (${dto.overtimeHrs}) exceed recorded overtime (${totalOvertime.toFixed(2)} hours)`);
    }
  }

  // ... rest of implementation
}
```

**Files to Modify:**

- `src/payrolls/payrolls.service.ts` - Add overlap and overtime validation

---

#### Issue 14: Missing Tax Calculation Improvements

**Priority:** 🟡 MEDIUM  
**Module:** Payrolls  
**Impact:** Inaccurate tax calculations

**Fix:**

```typescript
// src/payrolls/payrolls.service.ts
async calculateTaxAsync(
  employeeId: string,
  grossIncome: number,
  payPeriodStart: Date,
  payPeriodEnd: Date,
): Promise<number> {
  // Get employee tax config
  const taxConfig = await this.prisma.employeeTaxConfig.findUnique({
    where: { employeeId },
  });

  if (taxConfig?.taxExempt) {
    return 0;
  }

  // Get applicable tax bracket
  const taxBracket = await this.prisma.taxBracket.findFirst({
    where: {
      currencyCode: 'USD', // Should be dynamic
      countryCode: taxConfig?.taxCountry || 'US',
      taxYear: payPeriodStart.getFullYear(),
      minAmount: { lte: grossIncome },
      maxAmount: { gte: grossIncome },
      isDeleted: false,
    },
  });

  if (!taxBracket) {
    // No bracket found, return 0 or default rate
    return 0;
  }

  // Calculate tax
  const taxableAmount = grossIncome - taxBracket.minAmount;
  const tax = taxableAmount * taxBracket.taxRate + taxBracket.fixedAmount;

  return tax;
}
```

**Files to Modify:**

- `src/payrolls/payrolls.service.ts` - Improve tax calculation logic

---

### 2.2 Missing Query Parameters

#### Issue 15: Missing Filtering Parameters

**Priority:** 🟡 MEDIUM  
**Module:** Employees, Attendances, Leaves, Payrolls, Reports  
**Impact:** Limited API usability

**Fix:**

```typescript
// src/employees/dto/filter-employee.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsEnum,
    IsDate,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterEmployeeDto {
    @ApiPropertyOptional({ description: 'Filter by department ID' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'Filter by position ID' })
    @IsOptional()
    @IsString()
    positionId?: string;

    @ApiPropertyOptional({ description: 'Filter by manager ID' })
    @IsOptional()
    @IsString()
    managerId?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: ['active', 'inactive'],
    })
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status?: 'active' | 'inactive';

    @ApiPropertyOptional({ description: 'Filter by hire date from' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    hireDateFrom?: Date;

    @ApiPropertyOptional({ description: 'Filter by hire date to' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    hireDateTo?: Date;

    @ApiPropertyOptional({ description: 'Search by name or code' })
    @IsOptional()
    @IsString()
    search?: string;
}
```

```typescript
// src/employees/employees.controller.ts
@Get()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get all employees (Filtered & Paginated)' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'departmentId', required: false })
@ApiQuery({ name: 'positionId', required: false })
@ApiQuery({ name: 'managerId', required: false })
@ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
async findAll(
  @Query() pagination: PaginationDto,
  @Query() filters: FilterEmployeeDto,
) {
  const result = await this.employeesService.findAllFilteredAsync(
    pagination.page,
    pagination.limit,
    filters,
  );
  return result.getData();
}
```

```typescript
// src/employees/employees.service.ts
async findAllFilteredAsync(page: number, limit: number, filters: FilterEmployeeDto) {
  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
  };

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters.positionId) {
    where.positionId = filters.positionId;
  }

  if (filters.managerId) {
    where.managerId = filters.managerId;
  }

  if (filters.status === 'active') {
    where.isActive = true;
  } else if (filters.status === 'inactive') {
    where.isActive = false;
  }

  if (filters.hireDateFrom) {
    where.hireDate = { gte: filters.hireDateFrom };
  }

  if (filters.hireDateTo) {
    where.hireDate = { ...where.hireDate, lte: filters.hireDateTo };
  }

  if (filters.search) {
    where.OR = [
      { firstname: { contains: filters.search, mode: 'insensitive' } },
      { lastname: { contains: filters.search, mode: 'insensitive' } },
      { employeeCode: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [employees, total] = await this.prisma.$transaction([
    this.prisma.employee.findMany({
      skip,
      take: limit,
      where,
      include: {
        department: true,
        position: true,
        manager: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.employee.count({ where }),
  ]);

  return Result.ok({
    data: employees,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrevious: skip > 0,
    },
  });
}
```

**For Attendances:**

```typescript
// src/attendances/dto/filter-attendance.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class FilterAttendanceDto {
    @ApiPropertyOptional({ description: 'Filter by employee ID' })
    @IsOptional()
    @IsString()
    employeeId?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: AttendanceStatus,
    })
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @ApiPropertyOptional({ description: 'Filter by date from' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    dateFrom?: Date;

    @ApiPropertyOptional({ description: 'Filter by date to' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    dateTo?: Date;
}
```

**Files to Create:**

- `src/employees/dto/filter-employee.dto.ts`
- `src/attendances/dto/filter-attendance.dto.ts`
- `src/leaves/dto/filter-leave.dto.ts`
- `src/payrolls/dto/filter-payroll.dto.ts`

**Files to Modify:**

- `src/employees/employees.controller.ts` - Add filtering
- `src/employees/employees.service.ts` - Add filtering logic
- `src/attendances/attendances.controller.ts` - Add filtering
- `src/attendances/attendances.service.ts` - Add filtering logic
- `src/leaves/leaves.controller.ts` - Add filtering
- `src/leaves/leaves.service.ts` - Add filtering logic
- `src/payrolls/payrolls.controller.ts` - Add filtering
- `src/payrolls/payrolls.service.ts` - Add filtering logic

---

#### Issue 16: Missing Sorting Parameters

**Priority:** 🟡 MEDIUM  
**Module:** All  
**Impact:** Limited API usability

**Fix:**

```typescript
// src/common/dto/sorting.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class SortingDto {
    @ApiPropertyOptional({
        description: 'Field to sort by',
        example: 'createdAt',
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}
```

```typescript
// src/employees/employees.controller.ts
@Get()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get all employees (Filtered, Sorted & Paginated)' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'sortBy', required: false })
@ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
async findAll(
  @Query() pagination: PaginationDto,
  @Query() sorting: SortingDto,
  @Query() filters: FilterEmployeeDto,
) {
  const result = await this.employeesService.findAllFilteredSortedAsync(
    pagination.page,
    pagination.limit,
    sorting,
    filters,
  );
  return result.getData();
}
```

```typescript
// src/employees/employees.service.ts
async findAllFilteredSortedAsync(
  page: number,
  limit: number,
  sorting: SortingDto,
  filters: FilterEmployeeDto,
) {
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  // ... build where clause from filters

  const orderBy: any = {};
  if (sorting.sortBy) {
    orderBy[sorting.sortBy] = sorting.sortOrder;
  }

  const [employees, total] = await this.prisma.$transaction([
    this.prisma.employee.findMany({
      skip,
      take: limit,
      where,
      include: {
        department: true,
        position: true,
        manager: true,
      },
      orderBy,
    }),
    this.prisma.employee.count({ where }),
  ]);

  return Result.ok({
    data: employees,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrevious: skip > 0,
    },
  });
}
```

**Files to Create:**

- `src/common/dto/sorting.dto.ts`

**Files to Modify:**

- `src/common/dto/pagination.dto.ts` - Add sorting support
- All controller files - Add sorting parameters
- All service files - Add sorting logic

---

### 2.3 Missing Error Handling

#### Issue 17: Missing Validation Errors

**Priority:** 🟡 MEDIUM  
**Module:** All  
**Impact:** Poor validation error messages

**Fix:**

```typescript
// src/filters/validation-exception.filter.ts
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';

@Catch(ValidationError)
export class ValidationExceptionFilter implements ExceptionFilter {
    catch(exception: ValidationError[], host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const errors = exception.map((error) => ({
            field: error.property,
            constraints: error.constraints,
            children: error.children?.map((child) => ({
                field: child.property,
                constraints: child.constraints,
            })),
        }));

        response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
```

```typescript
// src/main.ts
import { ValidationExceptionFilter } from './filters/validation-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ... other setup

    app.useGlobalFilters(new ValidationExceptionFilter());

    await app.listen(process.env.PORT || 3001);
}
```

**Files to Create:**

- `src/filters/validation-exception.filter.ts`

**Files to Modify:**

- `src/main.ts` - Register ValidationExceptionFilter

---

### 2.4 Missing DTOs

#### Issue 18: Missing Update DTOs

**Priority:** 🟡 MEDIUM  
**Module:** Shifts, Attendances, Payrolls  
**Impact:** Incomplete API

**Fix:**

Already covered in Issue 10 (Missing Update Operations).

**Files to Create:**

- `src/shifts/dto/update-shift.dto.ts`
- `src/attendances/dto/update-attendance.dto.ts`
- `src/payrolls/dto/update-payroll.dto.ts`

---

### 2.5 Missing Endpoint Features

#### Issue 19: Missing Additional Reports

**Priority:** 🟡 MEDIUM  
**Module:** Reports  
**Impact:** Limited reporting capabilities

**Fix:**

```typescript
// src/reports/reports.controller.ts
@Get('attendance-detail')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get detailed attendance report' })
@ApiQuery({ name: 'month', required: true, type: Number })
@ApiQuery({ name: 'year', required: true, type: Number })
@ApiQuery({ name: 'employeeId', required: false })
@ApiQuery({ name: 'departmentId', required: false })
async getAttendanceDetail(
  @Query('month', ParseIntPipe) month: number,
  @Query('year', ParseIntPipe) year: number,
  @Query('employeeId') employeeId?: string,
  @Query('departmentId') departmentId?: string,
) {
  const result = await this.reportsService.getAttendanceDetailData(
    month,
    year,
    employeeId,
    departmentId,
  );
  return result.getData();
}

@Get('payroll-summary')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get payroll summary report' })
@ApiQuery({ name: 'month', required: true, type: Number })
@ApiQuery({ name: 'year', required: true, type: Number })
async getPayrollSummary(
  @Query('month', ParseIntPipe) month: number,
  @Query('year', ParseIntPipe) year: number,
) {
  const result = await this.reportsService.getPayrollSummaryData(month, year);
  return result.getData();
}

@Get('employee-summary')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get employee summary report' })
async getEmployeeSummary() {
  const result = await this.reportsService.getEmployeeSummaryData();
  return result.getData();
}
```

```typescript
// src/reports/reports.service.ts
async getAttendanceDetailData(
  month: number,
  year: number,
  employeeId?: string,
  departmentId?: string,
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const where: any = {
    date: { gte: startDate, lte: endDate },
    isDeleted: false,
  };

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (departmentId) {
    where.employee = { departmentId };
  }

  const attendances = await this.prisma.attendance.findMany({
    where,
    include: {
      employee: {
        include: {
          department: true,
          position: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  return Result.ok(attendances);
}

async getPayrollSummaryData(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const payrolls = await this.prisma.payroll.findMany({
    where: {
      payPeriodStart: { gte: startDate },
      payPeriodEnd: { lte: endDate },
      isDeleted: false,
    },
    include: {
      employee: {
        include: {
          department: true,
          position: true,
        },
      },
    },
  });

  const summary = {
    totalPayrolls: payrolls.length,
    totalNetSalary: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
    totalBasicSalary: payrolls.reduce((sum, p) => sum + p.basicSalary, 0),
    totalBonus: payrolls.reduce((sum, p) => sum + p.bonus, 0),
    totalDeductions: payrolls.reduce((sum, p) => sum + p.deductions, 0),
    byDepartment: this.groupByDepartment(payrolls),
    byStatus: this.groupByStatus(payrolls),
  };

  return Result.ok(summary);
}

async getEmployeeSummaryData() {
  const employees = await this.prisma.employee.findMany({
    where: { isDeleted: false },
    include: {
      department: true,
      position: true,
      _count: {
        select: {
          attendances: true,
          leaveRequests: true,
          payrolls: true,
        },
      },
    },
  });

  const summary = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.isActive).length,
    byDepartment: this.groupEmployeesByDepartment(employees),
    byPosition: this.groupEmployeesByPosition(employees),
    averageTenure: this.calculateAverageTenure(employees),
  };

  return Result.ok(summary);
}
```

**Files to Modify:**

- `src/reports/reports.controller.ts` - Add new report endpoints
- `src/reports/reports.service.ts` - Add new report methods

---

#### Issue 20: Missing User-Specific Endpoints

**Priority:** 🟡 MEDIUM  
**Module:** IAM, Employees  
**Impact:** Poor user experience

**Fix:**

```typescript
// src/employees/employees.controller.ts
@Get('me/attendances')
@Auth()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get current user attendance history' })
async getMyAttendances(
  @CurrentUser('sub') userId: string,
) {
  const employee = await this.employeesService.findByUserId(userId);
  if (!employee) {
    throw new NotFoundException('Employee');
  }

  const result = await this.attendancesService.findByEmployeeId(employee.id);
  return result.getData();
}

@Get('me/leaves')
@Auth()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get current user leave history' })
async getMyLeaves(
  @CurrentUser('sub') userId: string,
) {
  const employee = await this.employeesService.findByUserId(userId);
  if (!employee) {
    throw new NotFoundException('Employee');
  }

  const result = await this.leavesService.findByEmployeeId(employee.id);
  return result.getData();
}

@Get('me/payrolls')
@Auth()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Get current user payroll history' })
async getMyPayrolls(
  @CurrentUser('sub') userId: string,
) {
  const employee = await this.employeesService.findByUserId(userId);
  if (!employee) {
    throw new NotFoundException('Employee');
  }

  const result = await this.payrollsService.findByEmployeeId(employee.id);
  return result.getData();
}
```

**Files to Modify:**

- `src/employees/employees.controller.ts` - Add user-specific endpoints
- `src/employees/employees.service.ts` - Add findByUserId method
- `src/attendances/attendances.service.ts` - Add findByEmployeeId method
- `src/leaves/leaves.service.ts` - Add findByEmployeeId method
- `src/payrolls/payrolls.service.ts` - Add findByEmployeeId method

---

## 3. Nice to Have Issues (Low Priority)

### 3.1 Additional Features

#### Issue 21: Missing Leave Carryover

**Priority:** 🟢 LOW  
**Module:** Leaves  
**Impact:** Feature completeness

**Fix:**

```typescript
// src/automation/automation.service.ts
import { Cron } from '@nestjs/schedule';

@Cron('0 0 0 1 1 *') // January 1st at midnight
async handleLeaveCarryover() {
  const lastYear = new Date().getFullYear() - 1;
  const currentYear = new Date().getFullYear();

  const balances = await this.prisma.leaveBalance.findMany({
    where: {
      year: lastYear,
      isDeleted: false,
    },
  });

  for (const balance of balances) {
    const unused = balance.totalDays - balance.usedDays;

    if (unused > 0) {
      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: balance.employeeId,
            leaveType: balance.leaveType,
            year: currentYear,
          },
        },
        create: {
          employeeId: balance.employeeId,
          leaveType: balance.leaveType,
          year: currentYear,
          totalDays: unused,
          usedDays: 0,
          pendingDays: 0,
          performBy: 'SYSTEM',
        },
        update: {
          totalDays: { increment: unused },
          performBy: 'SYSTEM',
        },
      });
    }
  }
}
```

**Files to Modify:**

- `src/automation/automation.service.ts` - Add carryover cron job

---

#### Issue 22: Missing Half-Day Leave Support

**Priority:** 🟢 LOW  
**Module:** Leaves  
**Impact:** Feature completeness

**Fix:**

```typescript
// src/leaves/dto/create-leave.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
    @ApiProperty({ example: 'employee-uuid' })
    @IsNotEmpty()
    @IsString()
    employeeId: string;

    @ApiProperty({ example: '2026-02-01' })
    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsNotEmpty()
    @IsDateString()
    endDate: string;

    @ApiProperty({ enum: LeaveType })
    @IsNotEmpty()
    @IsEnum(LeaveType)
    leaveType: LeaveType;

    @ApiPropertyOptional({ example: 'Family vacation' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({
        example: 0.5,
        description: 'Half days (0.5, 1, 1.5, etc.)',
    })
    @IsOptional()
    @IsNumber()
    @Min(0.5)
    @Max(10)
    halfDays?: number;
}
```

```typescript
// src/leaves/leaves.service.ts
async createAsync(dto: CreateLeaveDto, performerId?: string) {
  // ... existing validations

  // Calculate leave days
  let leaveDays: number;

  if (dto.halfDays) {
    leaveDays = dto.halfDays;
  } else {
    leaveDays = this.calculateBusinessDays(startDate, endDate, publicHolidays);
  }

  // ... rest of implementation
}
```

**Files to Modify:**

- `src/leaves/dto/create-leave.dto.ts` - Add halfDays field
- `src/leaves/leaves.service.ts` - Handle half-day calculation

---

#### Issue 23: Missing Tax Filing Status

**Priority:** 🟢 LOW  
**Module:** Payrolls  
**Impact:** Feature completeness

**Fix:**

```typescript
// src/payrolls/dto/employee-tax-config.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export enum FilingStatus {
    SINGLE = 'SINGLE',
    MARRIED = 'MARRIED',
    HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD',
}

export class EmployeeTaxConfigDto {
    @ApiProperty({ example: 'US' })
    @IsNotEmpty()
    @IsString()
    taxCountry: string;

    @ApiProperty({ example: 'W-4' })
    @IsNotEmpty()
    @IsString()
    taxCode: string;

    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    taxExempt: boolean;

    @ApiPropertyOptional({ enum: FilingStatus })
    @IsOptional()
    @IsEnum(FilingStatus)
    filingStatus?: FilingStatus;
}
```

```typescript
// src/payrolls/payrolls.service.ts
async calculateTaxAsync(
  employeeId: string,
  grossIncome: number,
  payPeriodStart: Date,
  payPeriodEnd: Date,
): Promise<number> {
  const taxConfig = await this.prisma.employeeTaxConfig.findUnique({
    where: { employeeId },
  });

  if (taxConfig?.taxExempt) {
    return 0;
  }

  // Get tax bracket based on filing status
  const where: any = {
    currencyCode: 'USD',
    countryCode: taxConfig?.taxCountry || 'US',
    taxYear: payPeriodStart.getFullYear(),
    minAmount: { lte: grossIncome },
    maxAmount: { gte: grossIncome },
    isDeleted: false,
  };

  // Adjust bracket based on filing status
  if (taxConfig?.filingStatus === 'MARRIED') {
    // Use different bracket for married
    where.bracketName = { contains: 'Married' };
  } else if (taxConfig?.filingStatus === 'HEAD_OF_HOUSEHOLD') {
    where.bracketName = { contains: 'Head of Household' };
  }

  const taxBracket = await this.prisma.taxBracket.findFirst({ where });

  if (!taxBracket) {
    return 0;
  }

  const taxableAmount = grossIncome - taxBracket.minAmount;
  const tax = taxableAmount * taxBracket.taxRate + taxBracket.fixedAmount;

  return tax;
}
```

**Files to Modify:**

- `src/payrolls/dto/employee-tax-config.dto.ts` - Add filingStatus
- `src/payrolls/payrolls.service.ts` - Update tax calculation

---

### 3.2 Documentation

#### Issue 24: Missing API Documentation

**Priority:** 🟢 LOW  
**Module:** All  
**Impact:** Developer experience

**Fix:**

Create comprehensive API documentation file:

````markdown
# HRMS API Documentation

## Overview

This document provides comprehensive documentation for the HRMS API.

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
````

**Response:**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer <token>
```

## Error Codes

| Code               | HTTP Status | Description                 |
| ------------------ | ----------- | --------------------------- |
| `VALIDATION_ERROR` | 400         | Input validation failed     |
| `NOT_FOUND`        | 404         | Resource not found          |
| `UNAUTHORIZED`     | 401         | Authentication required     |
| `FORBIDDEN`        | 403         | Insufficient permissions    |
| `CONFLICT`         | 409         | Duplicate entry or conflict |
| `BUSINESS_ERROR`   | 400         | Business logic error        |
| `RATE_LIMITED`     | 429         | Too many requests           |
| `DATABASE_ERROR`   | 400         | Database error              |

## Rate Limiting

- **Login:** 5 requests per minute
- **Register:** 3 requests per minute
- **General:** 10 requests per minute

## Pagination

All list endpoints support pagination:

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page

**Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Filtering

All list endpoints support filtering:

**Query Parameters:**

- `departmentId` - Filter by department
- `positionId` - Filter by position
- `managerId` - Filter by manager
- `status` - Filter by status
- `dateFrom` - Filter by date range start
- `dateTo` - Filter by date range end
- `search` - Search by name or code

## Sorting

All list endpoints support sorting:

**Query Parameters:**

- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - Sort order: asc or desc (default: desc)

## Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
```

**Request:**

```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response:**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `401` - `INVALID_CREDENTIALS` - Invalid email or password
- `429` - `RATE_LIMITED` - Too many login attempts

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**

```json
{
    "id": "uuid-string",
    "username": "johndoe",
    "email": "john@example.com",
    "roles": ["EMPLOYEE"],
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `401` - `UNAUTHORIZED` - Invalid or missing token

### Employees

#### List Employees

```http
GET /api/employees?page=1&limit=10&departmentId=uuid&status=active
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `departmentId` - Filter by department ID
- `positionId` - Filter by position ID
- `managerId` - Filter by manager ID
- `status` - Filter by status (active/inactive)
- `search` - Search by name or employee code
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order (asc/desc, default: desc)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "employeeCode": "EMP001",
      "firstname": "John",
      "lastname": "Doe",
      "gender": "male",
      "dateOfBirth": "1990-01-01",
      "userId": "uuid-string",
      "address": "123 Main St",
      "phoneNumber": "+1234567890",
      "profileImage": "https://...",
      "hireDate": "2026-01-22T00:00:00.000Z",
      "position": { ... },
      "department": { ... },
      "manager": { ... },
      "isActive": true,
      "createdAt": "2026-01-22T00:00:00.000Z",
      "updatedAt": "2026-01-22T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Error Responses:**

- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions

#### Create Employee

```http
POST /api/employees
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "userId": "uuid-string",
    "departmentId": "uuid-string",
    "positionId": "uuid-string",
    "managerId": "uuid-string",
    "shiftId": "uuid-string",
    "employeeCode": "EMP001",
    "hireDate": "2026-01-22",
    "firstname": "John",
    "lastname": "Doe",
    "gender": 0,
    "dob": "1990-01-01",
    "address": "123 Main St",
    "phone": "+1234567890",
    "profileImage": "https://..."
}
```

**Response:**

```json
{
  "id": "uuid-string",
  "employeeCode": "EMP001",
  "firstname": "John",
  "lastname": "Doe",
  "gender": "male",
  "dateOfBirth": "1990-01-01",
  "userId": "uuid-string",
  "address": "123 Main St",
  "phoneNumber": "+1234567890",
  "profileImage": "https://...",
  "hireDate": "2026-01-22T00:00:00.000Z",
  "positionId": "uuid-string",
  "position": { ... },
  "departmentId": "uuid-string",
  "department": { ... },
  "isActive": true,
  "createdAt": "2026-01-22T00:00:00.000Z",
  "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `HIRE_DATE_FUTURE` - Hire date is in the future
- `409` - `UNIQUE_CONSTRAINT_VIOLATION` - Employee code already exists
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions

#### Update Employee

```http
PATCH /api/employees/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "departmentId": "uuid-string",
    "positionId": "uuid-string",
    "managerId": "uuid-string",
    "shiftId": "uuid-string",
    "firstname": "John",
    "lastname": "Doe",
    "address": "123 Main St",
    "phone": "+1234567890",
    "profileImage": "https://...",
    "isActive": true
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "firstname": "John",
    "lastname": "Doe",
    "departmentId": "uuid-string",
    "positionId": "uuid-string",
    "managerId": "uuid-string",
    "shiftId": "uuid-string",
    "address": "123 Main St",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "isActive": true,
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `404` - `NOT_FOUND` - Employee not found
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions

#### Delete Employee

```http
DELETE /api/employees/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
    "message": "Employee deleted successfully"
}
```

**Error Responses:**

- `404` - `NOT_FOUND` - Employee not found
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN)

### Leaves

#### List Leave Requests

```http
GET /api/takeleave?page=1&limit=10&employeeId=uuid&status=PENDING
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `employeeId` - Filter by employee ID
- `status` - Filter by status (PENDING, APPROVED, REJECTED, etc.)
- `leaveType` - Filter by leave type
- `startDateFrom` - Filter by start date from
- `startDateTo` - Filter by start date to
- `approvedBy` - Filter by approver ID
- `childIncluded` - Include related data (true/false)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "employeeId": "uuid-string",
      "approvedBy": "uuid-string",
      "startDate": "2026-02-01",
      "endDate": "2026-02-05",
      "leaveType": "ANNUAL_LEAVE",
      "status": "PENDING",
      "requestDate": "2026-01-22",
      "reason": "Family vacation",
      "requester": { ... },
      "approver": { ... },
      "createdAt": "2026-01-22T00:00:00.000Z",
      "updatedAt": "2026-01-22T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Error Responses:**

- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions

#### Create Leave Request

```http
POST /api/takeleave
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "employeeId": "uuid-string",
    "startDate": "2026-02-01",
    "endDate": "2026-02-05",
    "leaveType": "ANNUAL_LEAVE",
    "reason": "Family vacation"
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "startDate": "2026-02-01",
    "endDate": "2026-02-05",
    "leaveType": "ANNUAL_LEAVE",
    "status": "PENDING",
    "requestDate": "2026-01-22",
    "reason": "Family vacation",
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `LEAVE_BALANCE_INSUFFICIENT` - Insufficient leave balance
- `409` - `CONFLICT` - Leave overlaps with existing leave
- `401` - `UNAUTHORIZED` - Invalid or missing token

#### Update Leave Status

```http
PATCH /api/takeleave/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "status": "APPROVED"
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "status": "APPROVED",
    "approvedBy": "uuid-string",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `INVALID_LEAVE_STATUS` - Invalid status transition
- `404` - `NOT_FOUND` - Leave request not found
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN, HR, or Manager)

### Attendances

#### Check In

```http
POST /api/attendances/check-in
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "employeeId": "uuid-string",
    "date": "2026-01-22"
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "status": "PRESENT",
    "date": "2026-01-22",
    "checkInTime": "2026-01-22T09:00:00.000Z",
    "createdAt": "2026-01-22T09:00:00.000Z",
    "updatedAt": "2026-01-22T09:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `BUSINESS_ERROR` - Already checked in
- `401` - `UNAUTHORIZED` - Invalid or missing token

#### Check Out

```http
POST /api/attendances/check-out
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "employeeId": "uuid-string",
    "date": "2026-01-22"
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "status": "PRESENT",
    "date": "2026-01-22",
    "checkInTime": "2026-01-22T09:00:00.000Z",
    "checkOutTime": "2026-01-22T17:00:00.000Z",
    "updatedAt": "2026-01-22T17:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `BUSINESS_ERROR` - No check-in found
- `401` - `UNAUTHORIZED` - Invalid or missing token

### Payrolls

#### Process Payroll

```http
POST /api/payrolls/process
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
    "employeeId": "uuid-string",
    "payPeriodStart": "2026-01-01",
    "payPeriodEnd": "2026-01-31",
    "currencyCode": "USD",
    "basicSalary": 2500.0,
    "overtimeHrs": 10,
    "overtimeRate": 23.44,
    "bonus": 500.0,
    "deductions": 100.0
}
```

**Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "currencyCode": "USD",
    "payPeriodStart": "2026-01-01",
    "payPeriodEnd": "2026-01-31",
    "basicSalary": 2500.0,
    "overtimeHrs": 10,
    "overtimeRate": 23.44,
    "bonus": 500.0,
    "deductions": 100.0,
    "netSalary": 2850.0,
    "status": "PENDING",
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - `VALIDATION_ERROR` - Invalid input
- `400` - `PAYROLL_PERIOD_OVERLAP` - Payroll already exists for this period
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN, HR)

#### Finalize Payroll

```http
PATCH /api/payrolls/:id/finalize
Authorization: Bearer <token>
```

**Response:**

```json
{
    "id": "uuid-string",
    "status": "PROCESSED",
    "processedAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

**Error Responses:**

- `404` - `NOT_FOUND` - Payroll not found
- `400` - `INVALID_STATE` - Only pending payrolls can be finalized
- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN, HR)

### Reports

#### Attendance Summary

```http
GET /api/reports/attendance-summary?month=1&year=2026
Authorization: Bearer <token>
```

**Response:**

```json
{
  "total": 100,
  "present": 85,
  "absent": 5,
  "late": 8,
  "excused": 2,
  "details": [...]
}
```

**Error Responses:**

- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN, HR)

#### Export Attendance

```http
GET /api/reports/attendance-summary/export?month=1&year=2026&format=xlsx
Authorization: Bearer <token>
```

**Response:** Binary file (xlsx or csv)

**Error Responses:**

- `401` - `UNAUTHORIZED` - Invalid or missing token
- `403` - `FORBIDDEN` - Insufficient permissions (only ADMIN, HR)

---

## 4. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)

| Task                                            | Module                                                    | Priority | Estimated Time |
| ----------------------------------------------- | --------------------------------------------------------- | -------- | -------------- |
| Add missing indexes to schema                   | Schema                                                    | 🔴 HIGH  | 4 hours        |
| Implement rate limiting                         | Auth                                                      | 🔴 HIGH  | 2 hours        |
| Add permission checks (SelfGuard, ManagerGuard) | All                                                       | 🔴 HIGH  | 6 hours        |
| Fix N+1 query problem                           | All                                                       | 🔴 HIGH  | 8 hours        |
| Add pagination to missing endpoints             | Employees, Attendances, Payrolls, Users, TaxBrackets      | 🔴 HIGH  | 8 hours        |
| Fix error handling (use proper exceptions)      | Shifts, Payrolls, Currencies, TaxBrackets, PublicHolidays | 🔴 HIGH  | 4 hours        |
| Add token refresh endpoint                      | Auth                                                      | 🔴 HIGH  | 2 hours        |
| Add password reset functionality                | Auth                                                      | 🔴 HIGH  | 4 hours        |
| Add account lockout                             | Auth                                                      | 🔴 HIGH  | 3 hours        |
| Add Prisma exception filter                     | All                                                       | 🔴 HIGH  | 2 hours        |
| Add error codes                                 | All                                                       | 🔴 HIGH  | 2 hours        |
| **Total Phase 1**                               |                                                           |          | **45 hours**   |

### Phase 2: Important Fixes (Week 3-4)

| Task                                                          | Module                                            | Priority  | Estimated Time |
| ------------------------------------------------------------- | ------------------------------------------------- | --------- | -------------- |
| Add missing update operations (Shifts, Attendances, Payrolls) | Shifts, Attendances, Payrolls                     | 🟡 MEDIUM | 6 hours        |
| Implement business validations                                | Employees, Leaves, Payrolls, Shifts, TaxBrackets  | 🟡 MEDIUM | 8 hours        |
| Improve leave balance logic                                   | Leaves                                            | 🟡 MEDIUM | 4 hours        |
| Add payroll overlap check                                     | Payrolls                                          | 🟡 MEDIUM | 2 hours        |
| Add query parameters for filtering                            | Employees, Attendances, Leaves, Payrolls, Reports | 🟡 MEDIUM | 8 hours        |
| Add sorting parameters                                        | All                                               | 🟡 MEDIUM | 4 hours        |
| Add validation exception filter                               | All                                               | 🟡 MEDIUM | 2 hours        |
| Add missing DTOs (Update DTOs)                                | Shifts, Attendances, Payrolls                     | 🟡 MEDIUM | 4 hours        |
| **Total Phase 2**                                             |                                                   |           | **38 hours**   |

### Phase 3: Feature Completeness (Week 5-6)

| Task                                                                          | Module         | Priority  | Estimated Time |
| ----------------------------------------------------------------------------- | -------------- | --------- | -------------- |
| Add additional reports (attendance detail, payroll summary, employee summary) | Reports        | 🟢 LOW    | 6 hours        |
| Add user-specific endpoints (my attendances, my leaves, my payrolls)          | Employees, IAM | 🟢 LOW    | 4 hours        |
| Implement leave carryover                                                     | Leaves         | 🟢 LOW    | 3 hours        |
| Add half-day leave support                                                    | Leaves         | 🟢 LOW    | 2 hours        |
| Add tax filing status                                                         | Payrolls       | 🟢 LOW    | 3 hours        |
| Add CSRF protection                                                           | All            | 🟡 MEDIUM | 2 hours        |
| Add security headers                                                          | All            | 🟡 MEDIUM | 2 hours        |
| **Total Phase 3**                                                             |                |           | **22 hours**   |

### Phase 4: Documentation & Polish (Week 7-8)

| Task                              | Module | Priority | Estimated Time |
| --------------------------------- | ------ | -------- | -------------- |
| Document all error responses      | All    | 🟢 LOW   | 4 hours        |
| Add example requests/responses    | All    | 🟢 LOW   | 4 hours        |
| Add authentication examples       | Auth   | 🟢 LOW   | 2 hours        |
| Create API overview documentation | All    | 🟢 LOW   | 3 hours        |
| Add rate limit documentation      | Auth   | 🟢 LOW   | 1 hour         |
| Add pagination documentation      | All    | 🟢 LOW   | 1 hour         |
| Add filtering documentation       | All    | 🟢 LOW   | 1 hour         |
| **Total Phase 4**                 |        |          | **16 hours**   |

**Total Estimated Time:** 121 hours (approximately 3 weeks of full-time work)

---

## 5. Summary Statistics

### Issues by Priority

- **Critical (High Priority):** 30 issues
- **Important (Medium Priority):** 45 issues
- **Nice to Have (Low Priority):** 35 issues
- **Total:** 110 issues

### Issues by Category

- **Schema:** 30 issues
- **Endpoints:** 35 issues
- **Validation:** 20 issues
- **Business Logic:** 15 issues
- **Authentication:** 10 issues
- **Error Handling:** 10 issues
- **Performance:** 8 issues
- **Security:** 8 issues
- **Documentation:** 10 issues

### Issues by Module

- **Auth:** 10 issues
- **IAM/Users:** 8 issues
- **IAM/Roles:** 5 issues
- **Employees:** 12 issues
- **Departments:** 5 issues
- **Employee Positions:** 5 issues
- **Shifts:** 8 issues
- **Public Holidays:** 5 issues
- **Attendances:** 12 issues
- **Leaves:** 15 issues
- **Payrolls:** 15 issues
- **Currencies:** 5 issues
- **TaxBrackets:** 5 issues
- **Reports:** 8 issues

---

## 6. Recommendations

### Immediate Actions (This Week)

1. **Fix security vulnerabilities** - Implement rate limiting and permission checks
2. **Add missing indexes** - Improve query performance
3. **Fix error handling** - Use proper NestJS exceptions
4. **Add pagination** - Prevent scalability issues

### Short-term (Next 2 Weeks)

5. **Add missing CRUD operations** - Complete API coverage
6. **Implement business validations** - Ensure data integrity
7. **Add query parameters** - Improve API usability
8. **Document error responses** - Help developers

### Medium-term (Next Month)

9. **Add additional features** - Leave carryover, half-day leaves
10. **Improve business logic** - Tax calculation, payroll workflow
11. **Add caching** - Improve performance
12. **Add comprehensive tests** - Ensure reliability

### Long-term (Next Quarter)

13. **Add advanced features** - API keys, IP whitelisting
14. **Optimize database** - Query optimization, connection pooling
15. **Add monitoring** - Performance monitoring, error tracking
16. **Add CI/CD** - Automated testing and deployment

---

## 7. Conclusion

This implementation plan provides a comprehensive roadmap to address all identified issues in the HRMS API. The plan is organized by priority and phase, allowing for incremental improvements while maintaining system stability.

**Key Takeaways:**

- The API has a solid foundation but requires enhancements in security, performance, and completeness
- Critical issues should be addressed immediately to prevent security vulnerabilities and performance problems
- Medium priority issues will significantly improve API usability and data quality
- Low priority issues can be implemented as time permits to enhance feature completeness

**Next Steps:**

1. Review this plan with the development team
2. Prioritize issues based on business requirements
3. Create individual tickets for each issue
4. Begin implementation following the phased approach
5. Test thoroughly after each phase
6. Update documentation as features are added

**Success Metrics:**

- 100% of critical issues resolved
- 90% of medium priority issues resolved
- 50% of low priority issues resolved
- All endpoints documented with examples
- All error responses documented
- Performance improvements measurable (query times, response times)
- Security improvements (rate limiting, permission checks in place)

---

## 8. Appendix

### Useful Commands

```bash
# Install dependencies
npm install

# Run migrations
npm run prisma:migrate:dev

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run start:dev

# Run tests
npm run test

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/hrms_db
JWT_SECRET=your-super-secret-jwt-key

# Optional
PORT=3001
NODE_ENV=development
NEXT_APP_URL=http://localhost:3000
```

### File Structure

```
src/
├── common/
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   ├── paginated-response.dto.ts
│   │   └── sorting.dto.ts
│   ├── enums/
│   │   └── error-codes.enum.ts
│   ├── exceptions/
│   │   ├── business-error.exception.ts
│   │   ├── not-found.exception.ts
│   │   ├── conflict.exception.ts
│   │   └── unauthorized.exception.ts
│   └── guards/
│       ├── self.guard.ts
│       ├── manager.guard.ts
│       └── permission.guard.ts
├── filters/
│   ├── http-exception.filter.ts
│   ├── prisma-exception.filter.ts
│   └── validation-exception.filter.ts
├── modules/
│   ├── auth/
│   ├── employees/
│   ├── leaves/
│   ├── attendances/
│   ├── payrolls/
│   ├── reports/
│   └── ...
└── main.ts
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-22  
**Author:** API Analysis Team  
**Status:** Draft for Review
