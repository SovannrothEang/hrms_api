# Phase 4: Payroll Processing Implementation

## Goal
Implement the `PayrollsService` and `PayrollsController` to handle the full payroll lifecycle: draft creation, calculation (Gross → Deductions → Net), tax integration, and finalization.

---

## Prerequisites
- [x] `Currency` module exists (`src/modules/payroll/currencies`)
- [x] `TaxBracket` module exists (`src/modules/payroll/tax-brackets`)
- [x] Prisma schema: `Payroll`, `PayrollItems`, `TaxCalculation`, `EmployeeTaxConfig`
- [x] Seed data for `TaxBracket` (required for tax calculation testing)

---

## 1. New Module Structure

```
src/modules/payroll/payrolls/
├── dtos/
│   ├── process-payroll.dto.ts
│   ├── payroll.dto.ts
│   └── payroll-item.dto.ts
├── payrolls.controller.ts
├── payrolls.service.ts
└── payrolls.module.ts
```

---

## 2. Implementation Steps

### 2.1 DTOs

#### [NEW] `process-payroll.dto.ts`
| Field | Type | Validation |
|-------|------|------------|
| `employeeId` | `string` | Required, UUID |
| `payPeriodStart` | `Date` | Required |
| `payPeriodEnd` | `Date` | Required, must be > `payPeriodStart` |
| `overtimeHours` | `number` | Optional, default 0, >= 0 |
| `bonus` | `number` | Optional, default 0, >= 0 |
| `deductions` | `number` | Optional, default 0, >= 0 |
| `currencyCode` | `string` | Required (e.g. "USD", "KHR") |

#### [NEW] `payroll.dto.ts`
Response object mapping all `Payroll` fields plus nested `items` and `taxCalculation`.

#### [NEW] `payroll-item.dto.ts`
Response object for individual line items (EARNING, DEDUCTION).

---

### 2.2 Service: `PayrollsService`

**Dependencies**: `PrismaService`, `TaxBracketsService` (or inline query)

#### Methods

| Method | Description |
|--------|-------------|
| `createDraftAsync(dto, performBy)` | Creates `PENDING` payroll with calculated values |
| `finalizeAsync(id, performBy)` | Changes status to `PROCESSED`, locks record |
| `findByIdAsync(id)` | Returns payroll with items and tax details |
| `findAllAsync(filters)` | List payrolls (by employee, status, period) |

#### Calculation Logic (`createDraftAsync`)

1. **Fetch Employee** with `position` (for `salaryRangeMin` as base) and `taxConfig`.
2. **Calculate Gross**:
   ```
   basicSalary = employee.position.salaryRangeMin (or explicit if provided)
   overtimePay = overtimeHours * (basicSalary / 160) * 1.5
   grossIncome = basicSalary + overtimePay + bonus
   ```
3. **Calculate Tax**:
   - If `taxConfig.taxExempt === true` → `taxAmount = 0`
   - Else: Find `TaxBracket` where `minAmount <= grossIncome < maxAmount` for current year.
   - `taxAmount = (grossIncome * taxRate) - fixedAmount`
4. **Calculate Net**:
   ```
   netSalary = grossIncome - taxAmount - deductions
   ```
5. **Create Records**:
   - Insert `Payroll` (status: `PENDING`)
   - Insert `PayrollItems` (BASIC_SALARY, OVERTIME, BONUS, TAX, DEDUCTIONS)
   - Insert `TaxCalculation` snapshot

---

### 2.3 Controller: `PayrollsController`

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/payrolls/process` | POST | Create draft payroll | HR, ADMIN |
| `/payrolls/:id/finalize` | PATCH | Finalize payroll | HR, ADMIN |
| `/payrolls` | GET | List payrolls (with filters) | HR, ADMIN |
| `/payrolls/:id` | GET | Get single payroll details | HR, ADMIN, SELF |

---

### 2.4 Module Registration

#### [NEW] `payrolls.module.ts`
- Import `PrismaModule`
- Export `PayrollsService`

#### [MODIFY] `src/modules/payroll/payroll.module.ts` (if exists, else create)
- Import `PayrollsModule`, `CurrenciesModule`, `TaxBracketsModule`

#### [MODIFY] `src/app.module.ts`
- Import the payroll parent module

---

## 3. Verification Plan

### 3.1 Unit Tests (`payrolls.service.spec.ts`)
- [ ] Gross calculation accuracy (basic + overtime + bonus)
- [ ] Tax bracket selection (correct bracket for gross amount)
- [ ] Tax exempt employee returns tax = 0
- [ ] Net calculation = Gross - Tax - Deductions
- [ ] Currency code propagates correctly

### 3.2 Feature Tests (`payrolls.feature.spec.ts`)
- [ ] POST `/payrolls/process` creates PENDING payroll
- [ ] GET `/payrolls/:id` returns payroll with items
- [ ] PATCH `/payrolls/:id/finalize` changes status to PROCESSED
- [ ] Validation errors for missing employee, bad dates
- [ ] Role-based access (non-HR/ADMIN rejected)

### 3.3 Manual Verification
1. Seed `TaxBracket` for test year
2. Seed `Employee` with `EmployeeTaxConfig`
3. POST `/payrolls/process` via Swagger
4. Verify DB records: `Payroll`, `PayrollItems`, `TaxCalculation`

---

## 4. Enumeration Values

### PayrollStatus
- `PENDING` - Draft, editable
- `PROCESSED` - Finalized, locked
- `PAID` - (Future) Payment confirmed

### PayrollItemType
- `EARNING` - Basic Salary, Overtime, Bonus
- `DEDUCTION` - Tax, SSO, Other

---

## 5. Edge Cases to Handle
- Employee without `taxConfig` → Default to non-exempt with standard bracket
- No matching `TaxBracket` → Return error or use 0% rate
- Duplicate payroll for same period → Prevent or allow multiple drafts
- Overtime hours > 100 → Validate max reasonable value
