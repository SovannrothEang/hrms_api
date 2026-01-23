# HRMS API - Quick Reference Guide

## New Authentication Endpoints

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
    "token": "new-access-token"
}
```

### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**

```json
{
    "message": "If the email exists, a reset link has been sent"
}
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "uuid-reset-token",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**

```json
{
    "message": "Password reset successfully"
}
```

### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "OldSecurePassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**

```json
{
    "message": "Password changed successfully"
}
```

## Rate Limiting

### Limits

- **Login:** 5 requests per minute
- **Register:** 3 requests per minute
- **Refresh Token:** 10 requests per minute
- **Forgot Password:** 3 requests per minute
- **Reset Password:** 5 requests per minute
- **Change Password:** 5 requests per minute
- **General:** 10 requests per minute

### Rate Limit Response

```json
{
    "statusCode": 429,
    "code": "RATE_LIMITED",
    "message": "ThrottlerException: Too Many Requests",
    "timestamp": "2026-01-22T00:00:00.000Z"
}
```

## Pagination

### Query Parameters

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page

### Example

```http
GET /api/employees?page=1&limit=10
Authorization: Bearer <token>
```

### Response

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

### Employees

```http
GET /api/employees?departmentId=uuid&positionId=uuid&managerId=uuid&status=active&search=John
```

### Attendances

```http
GET /api/attendances?dateFrom=2026-01-01&dateTo=2026-01-31&status=PRESENT
```

### Leaves

```http
GET /api/takeleave?status=PENDING&leaveType=ANNUAL_LEAVE&startDateFrom=2026-02-01
```

### Payrolls

```http
GET /api/payrolls?year=2026&month=1&status=PENDING
```

## Sorting

### Query Parameters

- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - Sort order: asc or desc (default: desc)

### Example

```http
GET /api/employees?sortBy=lastname&sortOrder=asc
```

## Error Responses

### Standard Error Format

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [...],
  "timestamp": "2026-01-22T00:00:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Duplicate entry
- `BUSINESS_ERROR` - Business logic error
- `RATE_LIMITED` - Too many requests
- `UNIQUE_CONSTRAINT_VIOLATION` - Duplicate entry
- `LEAVE_BALANCE_INSUFFICIENT` - Insufficient leave balance
- `PAYROLL_ALREADY_EXISTS` - Payroll already exists for period

## Permission Guards

### SelfGuard

- Users can access their own data
- ADMIN can access any data
- Applied to: Employees, Users, Attendances, Leaves, Payrolls

### ManagerGuard

- Managers can access their subordinates' data
- ADMIN can access any data
- Applied to: Leaves (approval workflow)

## New Database Fields

### User Model

- `resetToken` - Password reset token
- `resetTokenExpiry` - Token expiry time
- `failedAttempts` - Failed login attempts counter
- `isLocked` - Account lock status
- `lockUntil` - Lock expiration time

## Migration Required

```bash
# Generate Prisma client
pnpm run prisma:generate

# Run migration
pnpm run prisma:migrate:dev --name "add_indexes_and_lockout_fields"
```

## Testing Checklist

- [ ] Login works with rate limiting
- [ ] Token refresh generates new valid tokens
- [ ] Password reset flow works
- [ ] Account lockout activates after 5 failed attempts
- [ ] Pagination returns correct metadata
- [ ] Filtering works on all list endpoints
- [ ] Sorting works on all list endpoints
- [ ] Permission guards prevent unauthorized access
- [ ] Error responses include error codes
- [ ] Swagger documentation is updated

## Important Notes

1. **Rate Limiting:** All auth endpoints are rate-limited to prevent abuse
2. **Pagination:** All list endpoints now support pagination
3. **Filtering:** Most list endpoints support filtering via query parameters
4. **Sorting:** All list endpoints support sorting
5. **Error Codes:** All errors now include consistent error codes
6. **Security:** Account lockout prevents brute force attacks
7. **Backward Compatibility:** All changes are backward compatible

## API Base URL

```
http://localhost:3001/api
```

## Swagger Documentation

```
http://localhost:3001/api/swagger
```

## Next Steps

1. Run database migration
2. Test all new endpoints
3. Update client applications to handle new error format
4. Implement rate limit handling in frontend
5. Add pagination to client-side lists
6. Document API usage for your team
