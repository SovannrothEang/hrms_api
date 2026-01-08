# Phase 3: Payroll Processing Implementation Plan

## Goal
Implement the core logic for generating payrolls, calculating taxes, and managing salary processing. This includes handling Gross-to-Net calculations based on employee configuration, tax brackets, and variable inputs (overtime, bonuses).

## Components

### 1. Payrolls Module (`src/modules/payroll/payrolls`)
This module will handle the lifecycle of a payroll record.

#### Service: `PayrollsService`
-   **Dependencies**: `PrismaService`, `CurrenciesService`, `TaxBracketsService`.
-   **Key Methods**:
    -   `createDraftAsync(dto)`: Creates or updates a `PENDING` payroll record.
        -   Calculates **Gross Income**:
            -   `Basic Salary`: From `EmployeePosition` (or explicit override).
            -   `Overtime`: `Overtime Hours` * `Overtime Rate`.
            -   `Bonus`: Input value.
        -   Calculates **Tax**:
            -   lookup `EmployeeTaxConfig`.
            -   If `taxExempt`, tax = 0.
            -   Else, find applicable `TaxBracket` for the `Gross Income`.
            -   `Tax = (Gross * Rate) - FixedAmount` (or specific formula).
        -   Calculates **Net Income**: `Gross - Tax - Deductions`.
        -   Saves `Payroll` and `PayrollItems`.
        -   Saves `TaxCalculation` snapshot.
    -   `finalizeAsync(id)`: Changes status to `PROCESSED`.
        -   Locks the record.
        -   Updates `Employee` or `Financial` records if needed (audit).
    -   `getByIdAsync(id)`: Retrieves payroll with items and tax details.
    -   `listAsync(params)`: Filter by month, year, status, employee.

#### Controller: `PayrollsController`
-   `POST /payrolls/process`: Triggers calculation and saves draft.
-   `PATCH /payrolls/:id/finalize`: Finalizes the payroll.
-   `GET /payrolls`: List payrolls.
-   `GET /payrolls/:id`: Get details.
-   `GET /payrolls/:id/payslip`: (Future) Generate PDF.

#### DTOs
-   `ProcessPayrollDto`:
    -   `employeeId`: UUID
    -   `payPeriodStart`: Date
    -   `payPeriodEnd`: Date
    -   `overtimeHours`: Number (optional)
    -   `bonus`: Number (optional)
    -   `deductions`: Number (optional)
-   `PayrollDto`: Response object.

### 2. Tax Logic
Logic will be embedded in `PayrollsService` or a dedicated `TaxCalculationService` if complex.
-   **Input**: Gross Salary, Tax Configuration.
-   **Process**:
    1.  Validate input.
    2.  Query `TaxBracket` for the relevant year and currency.
    3.  Find window: `Min <= Gross < Max`.
    4.  Apply rate and fixed amount.
-   **Output**: Tax Amount, Bracket Used ID.

## Database Interactions

### Tables Used
-   `Payroll` (Insert/Update)
-   `PayrollItems` (Insert - e.g., "Basic Salary", "Overtime", "Tax")
-   `TaxCalculation` (Insert snapshot)
-   `Employee` (Read - Position, Config)
-   `EmployeePosition` (Read - Salary)
-   `EmployeeTaxConfig` (Read)
-   `TaxBracket` (Read)

## Verification Plan

### Automated Tests
1.  **Unit Tests (`payrolls.service.spec.ts`)**:
    -   **Calculation Accuracy**: Verify Gross/Net math.
    -   **Tax Brackets**: Ensure correct bracket selection.
    -   **Exemptions**: Verify `taxExempt` logic.
    -   **Currency Handling**: Ensure currency codes propagate.

2.  **Feature Tests (`payrolls.feature.spec.ts`)**:
    -   **Flow**: Create Draft -> Verify values -> Finalize -> Verify Status.
    -   **Validation**: Bad dates, missing employee.
    -   **Security**: Ensure only authorized roles (HR/ADMIN) can process.

### Manual Verification
1.  Seed `TaxBrackets` (already done in Phase 2).
2.  Seed `Employee` with `EmployeeTaxConfig`.
3.  Hit `POST /payrolls/process` via Swagger.
4.  Check DB for created `Payroll`, `PayrollItems`, `TaxCalculation`.
