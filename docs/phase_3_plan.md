# Phase 3 Development Plan: Payroll & Advanced Scheduling

Building upon the Attendance and Leave modules, Phase 3 focuses on the **Payroll System** and refining workforce scheduling with **Shifts** and **Holidays**.

## 1. Work Scheduling (Shifts & Holidays)
*Refining attendance logic with real-world schedules.*

### 1.1 Shift Management
-   **Schema**: Create `Shift` model (Name, StartTime, EndTime, WorkDays, GracePeriod).
-   **Assignment**: Link `Employee` to `Shift`.
-   **Logic Update**:
    -   Update `AttendanceService` to check against assigned Shift.
    -   Dynamic "Late" and "Early Leave" marking.

### 1.2 Public Holidays
-   **Schema**: Create `PublicHoliday` model (Date, Name, IsRecurring).
-   **Logic Update**:
    -   `LeavesService`: Exclude holidays from leave duration calculation.
    -   `AttendanceService`: Auto-mark "Holiday" status if no check-in (instead of Absent).

## 2. Payroll Module
*Implementing the core financial engine using the existing robust schema.*

### 2.1 Configuration
-   **Currencies**: CRUD for `Currency` and `ExchangeRate`.
-   **Tax Brackets**: CRUD for `TaxBracket` (Progressive tax rules).
-   **Employee Config**: Manage `EmployeeTaxConfig` (Tax Code, Exempt status).

### 2.2 Payroll Processing
-   **Generation Service**:
    -   Calculate **Gross Pay**: `Basic Salary` + `Allowances`.
    -   Calculate **Deductions**: `Tax` (using Brackets) + `SSO` + `Leaves` (Unpaid).
    -   Calculate **Net Pay**.
-   **Run Payroll**: Batch processing for all employees in a department/period.

### 2.3 Payslip & Reporting
-   **Payslip**: detailed endpoint returning all line items for the UI.
-   **Bank Export**: Generate export files for bank transfers.

## 3. In-App Notifications
*Moving beyond email to persistent system alerts.*

-   **Schema**: Create `Notification` model (UserId, Title, Message, Type, IsRead, Link).
-   **Integration**:
    -   Trigger on Leave Approval/Rejection.
    -   Trigger on Payroll Release.
-   **Endpoints**: `GET /notifications`, `PATCH /notifications/:id/read`.

## 4. Technical Debt & Optimization
-   **Enum Standardization**: Ensure all status strings use Enums.
-   **Decimal Handling**: rigorous testing of financial calculations (Float vs Decimal).
-   **Role-Based Access**: Audit all new endpoints for `@Auth`.
