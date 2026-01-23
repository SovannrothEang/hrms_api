# HRMS API Documentation

## Overview

**HRMS API** is a comprehensive Human Resource Management System backend built with **NestJS** (TypeScript) using **Prisma ORM** with PostgreSQL. The system provides complete HR functionality including employee management, attendance tracking, leave management, and payroll processing.

---

## Technology Stack

| Layer                 | Technology                                |
| --------------------- | ----------------------------------------- |
| **Framework**         | NestJS v11                                |
| **Language**          | TypeScript v5.7                           |
| **ORM**               | Prisma v7.2                               |
| **Database**          | PostgreSQL                                |
| **Authentication**    | JWT (Bearer Token) with Passport.js       |
| **API Documentation** | Swagger/OpenAPI                           |
| **Security**          | Helmet, CORS, bcrypt for password hashing |
| **Containerization**  | Docker                                    |
| **Validation**        | class-validator + class-transformer       |

---

## Base URL

```
http://localhost:3001/api
```

## Swagger Documentation

```
http://localhost:3001/api/swagger
```

---

## Schema Definitions (Data Models)

### Core Database Models (Prisma Schema)

#### 1. User Management & Authentication

**User** (`users` table)

- `id`: String (UUID) - Primary key
- `username`: String (25 chars) - Unique username
- `email`: String (100 chars) - Unique email
- `password`: String (255 chars) - Hashed password (bcrypt)
- `userRoles`: Relation to UserRole (many-to-many with Role)
- `employee`: Relation to Employee (one-to-one, optional)
- `isActive`: Boolean (default: true)
- `isDeleted`: Boolean (default: false) - Soft delete flag
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

**Role** (`roles` table)

- `id`: String (UUID) - Primary key
- `name`: String (50 chars) - Role name
- `userRoles`: Relation to UserRole (many-to-many with User)

**UserRole** (`user_roles` table) - Junction table

- `userId`: String (UUID) - Foreign key to User
- `roleId`: String (UUID) - Foreign key to Role
- `assignedAt`: DateTime - When role was assigned

#### 2. HR Core Models

**Department** (`departments` table)

- `id`: String (UUID) - Primary key
- `departmentName`: String (150 chars) - Department name
- `employees`: Relation to Employee (one-to-many)
- `performBy`: String (UUID) - User who performed action
- `performer`: Relation to User (who created/modified)

**EmployeePosition** (`employee_positions` table)

- `id`: String (UUID) - Primary key
- `title`: String (100 chars) - Position title
- `description`: Text (optional)
- `salaryRangeMin`: Decimal (10,2) - Minimum salary
- `salaryRangeMax`: Decimal (10,2) - Maximum salary
- `employees`: Relation to Employee (one-to-many)

**Shift** (`shifts` table)

- `id`: String (UUID) - Primary key
- `name`: String (50 chars) - Shift name
- `startTime`: Time - Shift start time
- `endTime`: Time - Shift end time
- `workDays`: String (20 chars) - "1,2,3,4,5" (Mon-Fri)
- `gracePeriodMins`: SmallInt - Grace period in minutes
- `employees`: Relation to Employee (one-to-many)

**PublicHoliday** (`public_holidays` table)

- `id`: String (UUID) - Primary key
- `name`: String (100 chars) - Holiday name
- `date`: Date - Holiday date
- `isRecurring`: Boolean - Whether holiday recurs annually

**Employee** (`employees` table)

- `id`: String (UUID) - Primary key
- `userId`: String (UUID) - Unique, optional, links to User
- `departmentId`: String (UUID) - Foreign key to Department
- `positionId`: String (UUID) - Foreign key to EmployeePosition
- `managerId`: String (UUID) - Foreign key to Employee (self-referencing)
- `shiftId`: String (UUID) - Foreign key to Shift (optional)
- `employeeCode`: String (15 chars) - Unique employee code
- `hireDate`: Date - Employment start date
- `firstname`: String (70 chars)
- `lastname`: String (70 chars)
- `gender`: SmallInt (0: male, 1: female, 2: unknown)
- `dob`: Date - Date of birth
- `address`: Text (optional)
- `phone`: String (20 chars, optional)
- `profileImage`: Text (optional)
- `subordinates`: Relation to Employee (one-to-many, manager-subordinate)
- `taxConfig`: Relation to EmployeeTaxConfig (one-to-one)
- `attendances`: Relation to Attendance (one-to-many)
- `leaveRequests`: Relation to LeaveRequest (one-to-many)
- `approvedLeaveRequests`: Relation to LeaveRequest (one-to-many, as approver)
- `payrolls`: Relation to Payroll (one-to-many)
- `taxCalculations`: Relation to TaxCalculation (one-to-many)
- `leaveBalances`: Relation to LeaveBalance (one-to-many)

#### 3. Attendance & Leave Models

**Attendance** (`attendances` table)

- `id`: String (UUID) - Primary key
- `employeeId`: String (UUID) - Foreign key to Employee
- `status`: String (20 chars) - Attendance status
- `date`: Date - Attendance date
- `checkInTime`: Time (optional) - Check-in time
- `checkOutTime`: Time (optional) - Check-out time

**LeaveRequest** (`leave_requests` table)

- `id`: String (UUID) - Primary key
- `employeeId`: String (UUID) - Foreign key to Employee (requester)
- `approvedBy`: String (UUID) - Foreign key to Employee (approver, optional)
- `startDate`: Date - Leave start date
- `endDate`: Date - Leave end date
- `leaveType`: String (50 chars) - Leave type (see LeaveType enum)
- `status`: String (20 chars) - Leave status (see LeaveStatus enum)
- `requestDate`: Date - When request was made
- `reason`: Text (optional)
- `requester`: Relation to Employee (who requested)
- `approver`: Relation to Employee (who approved/rejected)

**LeaveBalance** (`leave_balances` table)

- `id`: String (UUID) - Primary key
- `employeeId`: String (UUID) - Foreign key to Employee
- `leaveType`: String (50 chars) - Leave type
- `year`: SmallInt - Year of balance
- `totalDays`: Decimal (5,2) - Total allocated days
- `usedDays`: Decimal (5,2) - Days used
- `pendingDays`: Decimal (5,2) - Days pending approval
- Unique: `[employeeId, leaveType, year]`

#### 4. Finance & Payroll Models

**Currency** (`currencies` table)

- `id`: String (UUID) - Primary key
- `code`: String (5 chars) - Unique currency code (e.g., "USD")
- `name`: String (50 chars) - Currency name
- `symbol`: String (5 chars) - Currency symbol
- `country`: String (15 chars) - Country code

**ExchangeRate** (`exchange_rates` table)

- `id`: String (UUID) - Primary key
- `fromCurrencyCode`: String (5 chars) - From currency
- `toCurrencyCode`: String (5 chars) - To currency
- `rate`: Decimal (10,6) - Exchange rate
- `date`: Date - Rate date
- `source`: String (100 chars, optional) - Rate source

**Payroll** (`payrolls` table)

- `id`: String (UUID) - Primary key
- `employeeId`: String (UUID) - Foreign key to Employee
- `currencyCode`: String (5 chars) - Currency code
- `baseCurrencyCode`: String (5 chars) - Base currency (optional)
- `payPeriodStart`: Date - Pay period start
- `payPeriodEnd`: Date - Pay period end
- `paymentDate`: Date (optional) - Actual payment date
- `basicSalary`: Decimal (12,2) - Base salary
- `overtimeHrs`: Decimal (4,2) - Overtime hours
- `overtimeRate`: Decimal (12,2) - Overtime rate per hour
- `bonus`: Decimal (12,2) - Bonus amount
- `deductions`: Decimal (12,2) - Total deductions
- `netSalary`: Decimal (12,2) - Final net salary
- `exchangeRate`: Decimal (10,6) - Exchange rate (optional)
- `baseCurrencyAmount`: Decimal (12,2) - Amount in base currency
- `status`: String (20 chars) - PENDING, PROCESSED, PAID
- `processedAt`: DateTime (optional) - When finalized
- `items`: Relation to PayrollItems (one-to-many)
- `taxCalculation`: Relation to TaxCalculation (one-to-one)

**PayrollItems** (`payroll_items` table)

- `id`: String (UUID) - Primary key
- `payrollId`: String (UUID) - Foreign key to Payroll
- `currencyCode`: String (5 chars) - Currency (optional)
- `itemType`: String (50 chars) - Type (e.g., "BONUS", "DEDUCTION")
- `itemName`: String (100 chars) - Item name
- `amount`: Decimal (12,2) - Amount
- `description`: Text (optional)

**TaxBracket** (`tax_brackets` table)

- `id`: String (UUID) - Primary key
- `currencyCode`: String (5 chars) - Currency code
- `countryCode`: String (5 chars) - Country code
- `taxYear`: SmallInt - Tax year
- `bracketName`: String (100 chars) - Bracket name
- `minAmount`: Decimal (12,2) - Minimum income
- `maxAmount`: Decimal (12,2) - Maximum income
- `taxRate`: Decimal (5,4) - Tax rate (e.g., 0.05 = 5%)
- `fixedAmount`: Decimal (12,2) - Fixed tax amount

**EmployeeTaxConfig** (`employee_tax_configs` table)

- `id`: String (UUID) - Primary key
- `employeeId`: String (UUID) - Unique, foreign key to Employee
- `taxCountry`: String (5 chars) - Tax country code
- `taxCode`: String (50 chars) - Tax code
- `taxExempt`: Boolean - Whether employee is tax exempt

**TaxCalculation** (`tax_calculations` table)

- `id`: String (UUID) - Primary key
- `payrollId`: String (UUID) - Unique, foreign key to Payroll
- `employeeId`: String (UUID) - Foreign key to Employee
- `taxBracketId`: String (UUID) - Foreign key to TaxBracket
- `taxPeriodStart`: Date - Tax period start
- `taxPeriodEnd`: Date - Tax period end
- `grossIncome`: Decimal (12,2) - Gross income
- `taxableIncome`: Decimal (12,2) - Taxable income
- `taxAmount`: Decimal (12,2) - Calculated tax
- `taxRateUsed`: Decimal (5,4) - Tax rate applied

#### 5. System & Audit Models

**AuditLog** (`audit_logs` table)

- `id`: String (UUID) - Primary key
- `userId`: String (UUID) - User who performed action
- `action`: String (100 chars) - Action type
- `tableName`: String (100 chars) - Table affected
- `recordId`: String (150 chars) - Record ID
- `oldValue`: Json - Old values (before change)
- `newValue`: Json - New values (after change)
- `timestamp`: DateTime - When action occurred

**CompanySettings** (`company_settings` table)

- `id`: String (UUID) - Primary key
- `name`: String (255 chars) - Company name
- `baseCurrencyCode`: String (5 chars) - Base currency
- `fiscalYearStartMonth`: SmallInt - Fiscal year start month (1-12)

**Slug** (`slugs` table)

- `id`: String (UUID) - Primary key
- `slug`: String (50 chars) - Unique slug
- `title`: String (50 chars) - Title
- `description`: Text (optional)
- `data`: Json (optional) - Additional data
- `status`: String (5 chars) - Status
- `createdBy`: String (UUID) - Creator
- `updatedBy`: String (UUID) - Updater

---

## Enums

### RoleName

```typescript
enum RoleName {
    ADMIN = 'ADMIN', // Full access to all modules
    HR = 'HR', // Employee, Leave, Payroll, Reports
    EMPLOYEE = 'EMPLOYEE', // Self-service only
}
```

### AttendanceStatus

```typescript
enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    EXCUSED = 'EXCUSED',
    EARLY_OUT = 'EARLY_OUT',
    OVERTIME = 'OVERTIME',
    DID_NOT_CHECKOUT = 'DID_NOT_CHECKOUT',
}
```

### LeaveStatus

```typescript
enum LeaveStatus {
    PENDING = 'PENDING', // Submitted, awaiting approval
    APPROVED = 'APPROVED', // Approved, balance updated
    REJECTED = 'REJECTED', // Denied
    CANCELLATION_PENDING = 'CANCELLATION_PENDING', // Cancellation requested
    CANCELED = 'CANCELED', // Withdrawn
    REVOKED = 'REVOKED', // Approval withdrawn
    ON_HOLD = 'ON_HOLD', // Needs more info
}
```

### LeaveType

```typescript
enum LeaveType {
    ANNUAL_LEAVE = 'ANNUAL_LEAVE',
    SICK_LEAVE = 'SICK_LEAVE',
    PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
    PARENTAL_LEAVE = 'PARENTAL_LEAVE',
    BEREAVEMENT_LEAVE = 'BEREAVEMENT_LEAVE',
    CASUAL_LEAVE = 'CASUAL_LEAVE',
    FAMILY_MEDICAL_LEAVE = 'FAMILY_MEDICAL_LEAVE',
    SABBATICAL = 'SABBATICAL',
    JURY_DUTY = 'JURY_DUTY',
    MILITARY_LEAVE = 'MILITARY_LEAVE',
    STUDY_LEAVE = 'STUDY_LEAVE',
    UNPAID_LEAVE = 'UNPAID_LEAVE',
    TIME_OFF_IN_LIEU = 'TIME_OFF_IN_LIEU',
    VOLUNTEER_LEAVE = 'VOLUNTEER_LEAVE',
    MENTAL_HEALTH_DAYS = 'MENTAL_HEALTH_DAYS',
}
```

---

## API Endpoints

### 1. Authentication Module (`/auth`)

| Endpoint      | Method | Auth Required | Role | Description                            |
| ------------- | ------ | ------------- | ---- | -------------------------------------- |
| `/auth/login` | POST   | No            | -    | User login, returns JWT token          |
| `/auth/me`    | GET    | Yes           | Any  | Get current authenticated user profile |

**Login Request Body:**

```json
{
    "email": "john@example.com",
    "password": "securePassword123"
}
```

**Login Response:**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Me Response:**

```json
{
    "id": "uuid-string",
    "username": "johndoe",
    "email": "john@example.com",
    "roles": ["EMPLOYEE"],
    "employees": {
        /* Employee DTO */
    },
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 2. Employees Module (`/employees`)

| Endpoint         | Method | Auth Required | Role     | Description                   |
| ---------------- | ------ | ------------- | -------- | ----------------------------- |
| `/employees`     | GET    | Yes           | Any      | List all employees            |
| `/employees/:id` | GET    | Yes           | Any      | Get employee by ID            |
| `/employees`     | POST   | Yes           | Admin/HR | Create new employee           |
| `/employees/:id` | PATCH  | Yes           | Admin/HR | Update employee               |
| `/employees/:id` | DELETE | Yes           | Admin    | Delete employee (soft delete) |

**Query Parameters:**

- `childIncluded` (boolean, optional): Include related data (department, position, user)

**Create Employee Request:**

```json
{
    "userId": "uuid-string", // Optional
    "departmentId": "uuid-string",
    "positionId": "uuid-string",
    "managerId": "uuid-string", // Optional
    "shiftId": "uuid-string", // Optional
    "employeeCode": "EMP001",
    "hireDate": "2026-01-22",
    "firstname": "John",
    "lastname": "Doe",
    "gender": 0, // 0: male, 1: female, 2: unknown
    "dob": "1990-01-01",
    "address": "123 Main St",
    "phone": "+1234567890",
    "profileImage": "https://..." // Optional
}
```

**Employee Response:**

```json
{
    "id": "uuid-string",
    "employeeCode": "EMP001",
    "firstname": "John",
    "lastname": "Doe",
    "gender": "male",
    "dateOfBirth": "1990-01-01",
    "userId": "uuid-string",
    "user": {
        /* User DTO */
    },
    "address": "123 Main St",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "hireDate": "2026-01-22T00:00:00.000Z",
    "positionId": "uuid-string",
    "position": {
        /* Position DTO */
    },
    "departmentId": "uuid-string",
    "department": {
        /* Department DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 3. Attendances Module (`/attendances`)

| Endpoint                 | Method | Auth Required | Role | Description                 |
| ------------------------ | ------ | ------------- | ---- | --------------------------- |
| `/attendances`           | GET    | Yes           | Any  | List all attendance records |
| `/attendances/:id`       | GET    | Yes           | Any  | Get attendance by ID        |
| `/attendances/check-in`  | POST   | Yes           | Any  | Employee check-in           |
| `/attendances/check-out` | POST   | Yes           | Any  | Employee check-out          |

**Query Parameters:**

- `childIncluded` (boolean, optional): Include employee and performer data

**Check-In Request:**

```json
{
    "employeeId": "uuid-string",
    "date": "2026-01-22"
}
```

**Check-Out Request:**

```json
{
    "employeeId": "uuid-string",
    "date": "2026-01-22"
}
```

**Attendance Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "status": "PRESENT",
    "date": "2026-01-22",
    "checkInTime": "2026-01-22T09:00:00.000Z",
    "checkOutTime": "2026-01-22T17:00:00.000Z",
    "employee": {
        /* Employee DTO */
    },
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T09:00:00.000Z",
    "updatedAt": "2026-01-22T17:00:00.000Z"
}
```

---

### 4. Leaves Module (`/takeleave`)

| Endpoint                | Method | Auth Required | Role             | Description                     |
| ----------------------- | ------ | ------------- | ---------------- | ------------------------------- |
| `/takeleave`            | GET    | Yes           | Any              | List leave requests (paginated) |
| `/takeleave/:id`        | GET    | Yes           | Any              | Get leave request by ID         |
| `/takeleave`            | POST   | Yes           | Any              | Create new leave request        |
| `/takeleave/:id/status` | PATCH  | Yes           | Admin/HR/Manager | Approve/Reject leave request    |
| `/takeleave/:id`        | DELETE | Yes           | Any              | Delete pending leave request    |

**Query Parameters (GET):**

- `childIncluded` (boolean, optional): Include employee and approver data
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page
- `employeeId` (string, optional): Filter by employee

**Create Leave Request:**

```json
{
    "employeeId": "uuid-string",
    "startDate": "2026-02-01",
    "endDate": "2026-02-05",
    "leaveType": "ANNUAL_LEAVE",
    "reason": "Family vacation"
}
```

**Update Leave Status:**

```json
{
    "status": "APPROVED" // or "REJECTED"
}
```

**Leave Request Response:**

```json
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
    "requester": {
        /* Employee DTO */
    },
    "approver": {
        /* Employee DTO */
    },
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 5. Payroll Module (`/payrolls`)

| Endpoint                 | Method | Auth Required | Role     | Description                            |
| ------------------------ | ------ | ------------- | -------- | -------------------------------------- |
| `/payrolls/process`      | POST   | Yes           | Admin/HR | Create draft payroll with calculations |
| `/payrolls`              | GET    | Yes           | Admin/HR | List payrolls with filters             |
| `/payrolls/:id`          | GET    | Yes           | Admin/HR | Get payroll details                    |
| `/payrolls/:id/finalize` | PATCH  | Yes           | Admin/HR | Finalize payroll (PENDING → PROCESSED) |
| `/payrolls/:id`          | DELETE | Yes           | Admin/HR | Delete pending payroll                 |

**Query Parameters (GET):**

- `employeeId` (string, optional): Filter by employee
- `status` (string, optional): Filter by status (PENDING, PROCESSED, PAID)
- `year` (number, optional): Filter by year
- `month` (number, optional): Filter by month (1-12)

**Process Payroll Request:**

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

**Payroll Response:**

```json
{
    "id": "uuid-string",
    "employeeId": "uuid-string",
    "currencyCode": "USD",
    "baseCurrencyCode": "KHR",
    "payPeriodStart": "2026-01-01",
    "payPeriodEnd": "2026-01-31",
    "paymentDate": "2026-02-05",
    "basicSalary": 2500.0,
    "overtimeHrs": 10,
    "overtimeRate": 23.44,
    "bonus": 500.0,
    "deductions": 100.0,
    "netSalary": 2850.0,
    "exchangeRate": 4000.0,
    "baseCurrencyAmount": 11400000.0,
    "status": "PENDING",
    "processedAt": null,
    "items": [
        /* PayrollItem DTOs */
    ],
    "taxCalculation": {
        /* TaxCalculation DTO */
    },
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 6. Departments Module (`/departments`)

| Endpoint           | Method | Auth Required | Role  | Description          |
| ------------------ | ------ | ------------- | ----- | -------------------- |
| `/departments`     | GET    | Yes           | Admin | List all departments |
| `/departments/:id` | GET    | Yes           | Admin | Get department by ID |
| `/departments`     | POST   | Yes           | Admin | Create department    |
| `/departments/:id` | PUT    | Yes           | Admin | Update department    |
| `/departments/:id` | DELETE | Yes           | Admin | Delete department    |

**Query Parameters:**

- `childIncluded` (boolean, optional): Include employees

**Create Department:**

```json
{
    "departmentName": "Engineering"
}
```

**Department Response:**

```json
{
    "id": "uuid-string",
    "name": "Engineering",
    "employees": [
        /* Employee DTOs */
    ],
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 7. Reports Module (`/reports`)

| Endpoint                             | Method | Auth Required | Role     | Description                      |
| ------------------------------------ | ------ | ------------- | -------- | -------------------------------- |
| `/reports/attendance-summary`        | GET    | Yes           | Admin/HR | Monthly attendance summary       |
| `/reports/attendance-summary/export` | GET    | Yes           | Admin/HR | Export attendance (xlsx/csv)     |
| `/reports/leave-utilization`         | GET    | Yes           | Admin/HR | Leave balance report (paginated) |
| `/reports/leave-utilization/export`  | GET    | Yes           | Admin/HR | Export leave data (xlsx/csv)     |

**Query Parameters:**

- `month` (number, required): Month (1-12)
- `year` (number, required): Year
- `format` (string, required for export): "xlsx" or "csv"
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page

**Attendance Summary Response:**

```json
{
    "total": 100,
    "present": 85,
    "absent": 5,
    "late": 8,
    "excused": 2,
    "details": [
        /* Attendance records */
    ]
}
```

**Leave Utilization Response:**

```json
{
    "data": [
        {
            "employeeId": "uuid-string",
            "employeeName": "John Doe",
            "leaveType": "ANNUAL_LEAVE",
            "year": 2026,
            "totalDays": 20,
            "usedDays": 5,
            "pendingDays": 2,
            "remainingDays": 13
        }
    ],
    "meta": {
        "page": 1,
        "limit": 10,
        "total": 100
    }
}
```

---

### 8. IAM Module (`/users` & `/roles`)

#### Users (`/users`) - Admin Only

| Endpoint     | Method | Role  | Description    |
| ------------ | ------ | ----- | -------------- |
| `/users`     | GET    | Admin | List all users |
| `/users/:id` | GET    | Admin | Get user by ID |
| `/users`     | POST   | Admin | Create user    |
| `/users/:id` | PUT    | Admin | Update user    |
| `/users/:id` | DELETE | Admin | Delete user    |

**Create User:**

```json
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securePassword123",
    "confirmPassword": "securePassword123"
}
```

**User Response:**

```json
{
    "id": "uuid-string",
    "username": "johndoe",
    "email": "john@example.com",
    "roles": ["EMPLOYEE"],
    "employees": {
        /* Employee DTO */
    },
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

#### Roles (`/roles`) - Admin Only

| Endpoint     | Method | Role  | Description    |
| ------------ | ------ | ----- | -------------- |
| `/roles`     | GET    | Admin | List all roles |
| `/roles/:id` | GET    | Admin | Get role by ID |
| `/roles`     | POST   | Admin | Create role    |
| `/roles/:id` | PUT    | Admin | Update role    |
| `/roles/:id` | DELETE | Admin | Delete role    |

**Query Parameters:**

- `childIncluded` (boolean, optional): Include users with this role

**Create Role:**

```json
{
    "roleName": "MANAGER"
}
```

**Role Response:**

```json
{
    "id": "uuid-string",
    "name": "MANAGER",
    "userRoles": [
        /* UserRole DTOs */
    ],
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 9. Employee Positions Module (`/employees/positions`)

| Endpoint                   | Method | Auth Required | Role  | Description        |
| -------------------------- | ------ | ------------- | ----- | ------------------ |
| `/employees/positions`     | GET    | Yes           | Admin | List all positions |
| `/employees/positions/:id` | GET    | Yes           | Admin | Get position by ID |
| `/employees/positions`     | POST   | Yes           | Admin | Create position    |
| `/employees/positions/:id` | PUT    | Yes           | Admin | Update position    |
| `/employees/positions/:id` | DELETE | Yes           | Admin | Delete position    |

**Query Parameters:**

- `childIncluded` (boolean, optional): Include employees

**Create Position:**

```json
{
    "title": "Senior Developer",
    "description": "Senior software engineer",
    "salaryRangeMin": 5000.0,
    "salaryRangeMax": 8000.0
}
```

**Position Response:**

```json
{
    "id": "uuid-string",
    "title": "Senior Developer",
    "description": "Senior software engineer",
    "salaryRangeMin": 5000.0,
    "salaryRangeMax": 8000.0,
    "employees": [
        /* Employee DTOs */
    ],
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 10. Shifts Module (`/shifts`)

| Endpoint      | Method | Auth Required | Role     | Description     |
| ------------- | ------ | ------------- | -------- | --------------- |
| `/shifts`     | GET    | Yes           | Admin/HR | List all shifts |
| `/shifts/:id` | GET    | Yes           | Admin/HR | Get shift by ID |
| `/shifts`     | POST   | Yes           | Admin/HR | Create shift    |
| `/shifts/:id` | DELETE | Yes           | Admin/HR | Delete shift    |

**Create Shift:**

```json
{
    "name": "Morning Shift",
    "startTime": "09:00:00",
    "endTime": "17:00:00",
    "workDays": "1,2,3,4,5",
    "gracePeriodMins": 15
}
```

**Shift Response:**

```json
{
    "id": "uuid-string",
    "name": "Morning Shift",
    "startTime": "09:00",
    "endTime": "17:00",
    "workDays": "1,2,3,4,5",
    "gracePeriodMins": 15
}
```

---

### 11. Public Holidays Module (`/public-holidays`)

| Endpoint               | Method | Auth Required | Role     | Description              |
| ---------------------- | ------ | ------------- | -------- | ------------------------ |
| `/public-holidays`     | GET    | Yes           | Admin/HR | List all public holidays |
| `/public-holidays/:id` | GET    | Yes           | Admin/HR | Get holiday by ID        |
| `/public-holidays`     | POST   | Yes           | Admin/HR | Create holiday           |
| `/public-holidays/:id` | DELETE | Yes           | Admin/HR | Delete holiday           |

**Create Public Holiday:**

```json
{
    "name": "New Year's Day",
    "date": "2026-01-01",
    "isRecurring": true
}
```

**Public Holiday Response:**

```json
{
    "id": "uuid-string",
    "name": "New Year's Day",
    "date": "2026-01-01",
    "isRecurring": true,
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 12. Payroll - Currencies Module (`/currencies`)

| Endpoint          | Method | Auth Required | Role     | Description         |
| ----------------- | ------ | ------------- | -------- | ------------------- |
| `/currencies`     | GET    | Yes           | Admin/HR | List all currencies |
| `/currencies/:id` | GET    | Yes           | Admin/HR | Get currency by ID  |
| `/currencies`     | POST   | Yes           | Admin/HR | Create currency     |
| `/currencies/:id` | DELETE | Yes           | Admin/HR | Delete currency     |

**Create Currency:**

```json
{
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "country": "US"
}
```

**Currency Response:**

```json
{
    "id": "uuid-string",
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$",
    "country": "US",
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

### 13. Payroll - Tax Brackets Module (`/tax-brackets`)

| Endpoint            | Method | Auth Required | Role     | Description           |
| ------------------- | ------ | ------------- | -------- | --------------------- |
| `/tax-brackets`     | GET    | Yes           | Admin/HR | List all tax brackets |
| `/tax-brackets`     | POST   | Yes           | Admin/HR | Create tax bracket    |
| `/tax-brackets/:id` | DELETE | Yes           | Admin/HR | Delete tax bracket    |

**Query Parameters (GET):**

- `country` (string, optional): Filter by country code
- `year` (number, optional): Filter by tax year

**Create Tax Bracket:**

```json
{
    "currencyCode": "USD",
    "countryCode": "US",
    "taxYear": 2026,
    "bracketName": "Low Income",
    "minAmount": 0.0,
    "maxAmount": 10000.0,
    "taxRate": 0.05,
    "fixedAmount": 0.0
}
```

**Tax Bracket Response:**

```json
{
    "id": "uuid-string",
    "currencyCode": "USD",
    "countryCode": "US",
    "taxYear": 2026,
    "bracketName": "Low Income",
    "minAmount": 0.0,
    "maxAmount": 10000.0,
    "taxRate": 0.05,
    "fixedAmount": 0.0,
    "performer": {
        /* User DTO */
    },
    "isActive": true,
    "createdAt": "2026-01-22T00:00:00.000Z",
    "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

---

## Authentication & Authorization

### JWT Authentication

**Token Generation:**

- Algorithm: HS256
- Secret: `process.env.JWT_SECRET` (default: "superSecretKey")
- Expiration: 1 hour
- Audience: "hrms_audience"
- Issuer: "hrms_issuer"

**Token Payload:**

```json
{
    "sub": "user-uuid",
    "email": "user@example.com",
    "roles": ["ADMIN", "HR"],
    "iat": 1234567890,
    "exp": 1234567890,
    "aud": "hrms_audience",
    "iss": "hrms_issuer"
}
```

**Usage:**

1. Login to receive token: `POST /api/auth/login`
2. Include in Authorization header: `Authorization: Bearer <token>`
3. All authenticated endpoints require this header

### Role-Based Access Control (RBAC)

| Role         | Permissions                                                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADMIN**    | Full access to all modules                                                                                                                                                                                                   |
| **HR**       | - Employee management<br>- Leave management<br>- Payroll processing<br>- Reports generation<br>- Department management<br>- Position management<br>- Shift management<br>- Public holidays<br>- Currencies<br>- Tax brackets |
| **EMPLOYEE** | - View own profile (`/auth/me`)<br>- Check-in/out (`/attendances/check-in`, `/check-out`)<br>- View own attendance<br>- Submit leave requests (`/takeleave`)<br>- View own leave requests<br>- Delete pending leave requests |

### Security Features

1. **JWT Bearer Authentication** - Stateless token-based auth
2. **Helmet** - HTTP security headers (CSP, HSTS, etc.)
3. **CORS** - Configured for specific origins only
4. **Soft Delete** - All entities have `isDeleted` flag (data preservation)
5. **Audit Trail** - `performBy` field tracks who created/modified records
6. **Password Hashing** - bcrypt with salt rounds for secure storage
7. **Input Validation** - class-validator decorators on DTOs
8. **Timing Attack Prevention** - Consistent bcrypt comparison timing

---

## Environment Variables

### Required Environment Variables

| Variable       | Description                          | Default                 | Required         |
| -------------- | ------------------------------------ | ----------------------- | ---------------- |
| `DATABASE_URL` | PostgreSQL connection string         | -                       | Yes              |
| `JWT_SECRET`   | JWT signing secret                   | "superSecretKey"        | Yes (Production) |
| `PORT`         | Application port                     | 3001                    | No               |
| `NEXT_APP_URL` | Frontend URL for CORS                | "http://localhost:3000" | No               |
| `NODE_ENV`     | Environment (development/production) | -                       | No               |

### Example .env File

```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/hrms_db
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3001
NEXT_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Configuration Files

### Main Configuration Files

1. **`src/main.ts`** - Application bootstrap
    - Swagger configuration
    - Global middleware setup
    - CORS configuration
    - Global prefix: `/api`

2. **`src/app.module.ts`** - Root module
    - ConfigModule (global)
    - LoggerModule (Pino)
    - All feature modules imported
    - Global middleware (ContextMiddleware)

3. **`prisma/schema.prisma`** - Database schema
    - All data models defined
    - Relations and indexes
    - Soft delete pattern applied

4. **`prisma.config.ts`** - Prisma configuration
    - Schema path
    - Migration path
    - Seed script configuration

5. **`package.json`** - Dependencies and scripts
    - NestJS v11
    - Prisma v7.2
    - Passport.js for auth
    - Swagger for API docs
    - Pino for logging

---

## Design Patterns & Best Practices

### 1. Result Pattern

Services return `Result<T>` for consistent error handling:

```typescript
Result.ok<T>(data); // Success
Result.fail<T>(error); // Failure
```

### 2. DTO Validation

All input validated using class-validator decorators:

- `@IsEmail()`, `@IsNotEmpty()`, `@IsString()`
- Automatic validation via `ValidationPipe`

### 3. Soft Delete Pattern

All entities have:

- `isDeleted: Boolean @default(false)`
- `deletedAt: DateTime?`
- Queries filter by `isDeleted = false`

### 4. Performer Tracking

All entities track who performed actions:

- `performBy: String?` - User ID
- `performer: User?` - Relation to User
- Automatically populated from JWT token

### 5. Global API Prefix

All routes prefixed with `/api`:

```typescript
app.setGlobalPrefix('api');
```

### 6. Transform Interceptor

Consistent response structure:

```json
{
    "data": {
        /* response data */
    },
    "timestamp": "2026-01-22T00:00:00.000Z"
}
```

### 7. Exception Filter

Global exception handling with consistent error responses:

```json
{
    "message": "Resource not found",
    "error": "Not Found",
    "statusCode": 404
}
```

---

## Automation & Scheduled Tasks

### Automation Module

**Auto-Checkout Job** (Runs daily at 23:59:00)

- Marks attendance as `DID_NOT_CHECKOUT` for employees who didn't check out
- Prevents incomplete attendance records

**Absent Marking Job** (Runs daily at 18:00:00)

- Marks employees as `ABSENT` if:
    - No attendance record exists
    - Not on approved leave
- Ensures complete attendance tracking

---

## Email/Notifications

### Email Service (`/modules/notifications/email.service.ts`)

**Features:**

- Leave request notifications to managers
- Leave status update notifications to employees
- Mock implementation (logs to console)
- Ready for production SMTP integration

**Configuration:**

- SMTP host: `smtp.example.com`
- Port: 587
- Secure: false
- Auth: user/pass from config

---

## Database Indexes

### Performance Optimizations

**Users Table:**

- `@@index([id])`
- `@@index([email])`
- `@@index([isDeleted, isActive])`

**Employees Table:**

- `@@index([departmentId])`
- `@@index([positionId])`
- `@@index([managerId])`
- `@@index([lastname])`

**Attendances Table:**

- `@@index([employeeId])`
- `@@index([date])` - Optimize date range reports
- `@@index([employeeId, date])` - Optimize specific employee lookup

**Leave Requests Table:**

- `@@index([employeeId])`
- `@@index([approvedBy])`
- `@@index([status])` - Filter Pending vs Approved
- `@@index([startDate, endDate])` - Overlap checks

**Payrolls Table:**

- `@@index([employeeId])`
- `@@index([payPeriodStart, payPeriodEnd])` - Reporting by period
- `@@index([status])` - Find pending payrolls
- `@@index([currencyCode])`

**Tax Calculations Table:**

- `@@index([employeeId])`
- `@@index([taxBracketId])`
- `@@index([taxPeriodStart, taxPeriodEnd])`

---

## Deployment & Development

### Local Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm exec prisma migrate dev

# Seed database
pnpm run seed

# Start development server
pnpm run start:dev
```

### Docker Development

```bash
# Start with Docker Compose
docker compose -f docker-compose.development.yml up --build -d

# Seed database in Docker
docker compose -f docker-compose.development.yml exec api pnpm exec prisma db seed
```

### Production Build

```bash
# Build
pnpm run build

# Start production
pnpm run start:prod
```

---

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

---

## Additional Documentation

### Available Documentation Files

- `docs/ARCHITECTURE.md` - Detailed architecture overview
- `docs/attendance_leave_module_design.md` - Leave and attendance design
- `docs/phase-3-payroll-processing.md` - Payroll processing workflow
- `docs/phase-4-payroll-implementation.md` - Payroll implementation details
- `docs/bug-report-soft-delete-filtering.md` - Soft delete filtering issues

---

## Summary

This HRMS API provides a comprehensive, production-ready backend for human resource management with:

✅ **Complete Authentication** - JWT-based with role-based access control  
✅ **Employee Management** - Full CRUD with soft delete  
✅ **Attendance Tracking** - Check-in/out with automated absent marking  
✅ **Leave Management** - Request, approval workflow with balance tracking  
✅ **Payroll Processing** - Multi-currency, tax calculations, itemized breakdown  
✅ **Reports & Exports** - Attendance summaries, leave utilization (xlsx/csv)  
✅ **Audit Trail** - All actions tracked with performer information  
✅ **Soft Delete** - Data preservation with deletion flags  
✅ **Scheduled Tasks** - Automated attendance processing  
✅ **Email Notifications** - Leave request and status updates  
✅ **Swagger Documentation** - Auto-generated API docs  
✅ **Security** - Helmet, CORS, bcrypt, input validation  
✅ **Type Safety** - Full TypeScript with Prisma client

**API Base URL:** `http://localhost:3001/api`  
**Swagger UI:** `http://localhost:3001/api/swagger`
