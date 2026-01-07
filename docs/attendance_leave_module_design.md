# Attendance & Leave Modules Design Specification

## 1. Overview
This document outlines the design and implementation approach for the **Attendance** and **Leave Management** modules in the HRMS API. The goal is to provide a robust system for tracking employee work hours and managing time-off requests.

- **Attendance Module**: Handles daily check-in/check-out operations, time tracking, and attendance status (Present, Late, Absent).
- **Leave Module**: Manages leave requests (Annual, Sick, Unpaid), approval workflows, and leave history.

## 2. Plan

### Phase 1: Attendance Module
1.  **Enhance DTOs**: Update `AttendanceDto`, create `CheckInDto`, `CheckOutDto`.
2.  **Service Logic**:
    -   Implement `checkIn(employeeId)`: validation & record creation.
    -   Implement `checkOut(employeeId)`: validation & update record.
    -   Implement `getAttendanceHistory(employeeId, range)`.
3.  **Controller**: Expose endpoints for check-in, check-out, and history.

### Phase 2: Leave Module (New)
1.  **Module Setup**: Create `src/modules/leaves`.
2.  **DTOs**: Create `LeaveRequestDto`, `CreateLeaveDto`, `UpdateLeaveStatusDto`.
3.  **Service Logic**:
    -   Implement `requestLeave`: Date validation, overlap check.
    -   Implement `getLeaves`: Filter by status, employee.
    -   Implement `updateStatus`: Approve/Reject logic (Manager/Admin).
4.  **Controller**: Expose endpoints for CRUD operations.

## 3. Walkthrough (User Flow)

### 3.1 Daily Attendance
1.  **Employee Login**: User logs into the mobile/web app.
2.  **Check In**: Dashboard shows "Check In" button.
    -   User clicks "Check In".
    -   System records current timestamp `checkInTime`.
    -   Status set to "Present" (or "Late" if after threshold).
3.  **Work Day**: Employee performs duties.
4.  **Check Out**: End of day, user clicks "Check Out".
    -   System updates `checkOutTime`.
    -   Total hours are calculated (optional immediately or via job).

### 3.2 Leave Request
1.  **Request**: Employee navigates to "My Leaves" -> "New Request".
    -   Selects Leave Type (Sick, Annual).
    -   Selects Start/End Dates.
    -   Submits form.
2.  **Notification**: Manager (or Admin) sees pending request.
3.  **Approval**: Manager reviews reason and dates.
    -   Clicks "Approve".
    -   Status updates to "Approved".
    -   (Optional) Leave balance is deducted.

## 4. Case Scenarios

### Scenario A: Double Check-In
*   **Action**: User tries to Check In twice on the same day.
*   **System Response**: Error "You have already checked in for today."

### Scenario B: Forgotten Check-Out
*   **Action**: User checks in but forgets to check out.
*   **System Response**:
    *   Next day, previous record remains open.
    *   System Auto-Checkout Job (optional future feature) or Admin manual correction.
    *   User sees "Missing Check-out" alert.

### Scenario C: Overlapping Leave
*   **Action**: User requests Annual Leave for Jan 10-12. Later requests Sick Leave for Jan 11.
*   **System Response**: Error "You already have a leave request for this period."

## 5. Coding Overview

### 5.1 Data Models (Prisma)
Existing models in `schema.prisma` are sufficient for MVP.

**Attendance**:
```prisma
model Attendance {
  id           String    @id @default(uuid())
  employeeId   String
  status       String    // "PRESENT", "LATE", "ABSENT", "HALF_DAY"
  date         DateTime  @db.Date
  checkInTime  DateTime? @db.Time
  checkOutTime DateTime? @db.Time
  ...
}
```

**LeaveRequest**:
```prisma
model LeaveRequest {
  id          String   @id @default(uuid())
  employeeId  String
  startDate   DateTime
  endDate     DateTime
  leaveType   String   // "SICK", "ANNUAL", "UNPAID"
  status      String   // "PENDING", "APPROVED", "REJECTED"
  reason      String?
  approvedBy  String?
  ...
}
```

### 5.2 API Endpoints

#### Attendance (`/attendances`)
-   `POST /check-in`: Create attendance record for today.
-   `POST /check-out`: Update today's record with check-out time.
-   `GET /me`: Get current user's attendance history.
-   `GET /report`: (Admin) Get attendance by date range.

#### Leaves (`/leaves`)
-   `POST /`: Request new leave.
-   `GET /`: Get my leaves.
-   `GET /pending`: (Manager) Get pending approvals.
-   `PATCH /:id/status`: Approve or Reject a leave request.
-   `DELETE /:id`: Cancel a pending request.

## 6. Testing Strategy

### 6.1 Unit Testing (`.spec.ts`)
-   **Service Layer**: Mock `PrismaService`.
    -   Test `checkIn`: Verify it calls `prisma.attendance.create`.
    -   Test `checkIn` duplicate: Verify it throws `BadRequestException`.
    -   Test `requestLeave` overlap: Verify it checks existing dates.

### 6.2 E2E Testing (`test/app.e2e-spec.ts`)
-   **Flow**:
    1.  Seed User & Employee.
    2.  Login -> Get Token.
    3.  Call `POST /attendances/check-in` -> Expect 201 Created.
    4.  Call `POST /attendances/check-in` again -> Expect 400 Bad Request.
    5.  Call `POST /attendances/check-out` -> Expect 200 OK.
