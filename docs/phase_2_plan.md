# Phase 2 Development Plan: Advanced Attendance & Leave Management

Following the successful implementation of the core Attendance and Leave modules, the next phase focuses on automation, business rules validation, and deeper integration.

## 1. Leave Balance Management
Currently, employees can request leaves without checking if they have sufficient balance.
**Action Items:**
- **Schema Update**: Create `LeaveBalance` model (EmployeeId, LeaveType, Year, Total, Used, Pending).
- **Logic Implementation**:
    -   When requesting leave: Check `(Total - Used - Pending) >= RequestedDays`.
    -   When approving: Increment `Used`, Decrement `Pending`.
    -   When rejecting/cancelling: Decrement `Pending`.
- **Accrual System**: Automated job to add monthly leave credits (e.g., 1.25 days/month).

## 2. Business Days & Public Holidays
Leave duration is currently raw calendar days. It needs to exclude weekends and holidays.
**Action Items:**
- **Public Holiday Module**: CRUD for holidays.
- **Duration Calculation**: Service to calculate `EffectiveLeaveDays` = `(EndDate - StartDate) - Weekends - Holidays`.
- **Partial Days**: Support Half-Day leave requests.

## 3. Shift Management (Dynamic Attendance)
Attendance currently assumes a fixed 9:00 AM start for everyone.
**Action Items:**
- **Shift Model**: Define `Shift` (Name, StartTime, EndTime, GracePeriod).
- **Assignment**: Assign Shifts to Departments or specific Employees.
- **Enhanced Check-In**:
    -   Compare `CheckInTime` vs `Employee.Shift.StartTime`.
    -   Determine "Late" status dynamically based on assigned shift.

## 4. Notifications & Workflows
Users need real-time updates on their requests.
**Action Items:**
- **In-App Notifications**: `Notification` model for alerts.
- **Email Integration**: Send emails to Managers when a request is created, and to Employees when status changes.
- **Hierarchy Approvals**: Support multi-level approvals (e.g., Line Manager -> HR Manager).

## 5. Reporting & Analytics
**Action Items:**
- **Attendance Report**: Monthly summary of Present/Late/Absent days per employee.
- **Leave Report**: Balance summary and utilization rates.
- **Export**: CSV/PDF export for Payroll processing.

## 6. Automations (Cron Jobs)
**Action Items:**
- **Auto-Checkout**: Mark checkout at 11:59 PM if missing (status: `DID_NOT_CHECKOUT`).
- **Absent Marking**: If no Check-In by end of shift, auto-create Attendance record with `ABSENT` status.
