# HRMS API - Agent Guidelines

## Build & Test Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server (with watch)
pnpm run start:dev

# Start debug mode
pnpm run start:debug

# Build for production
pnpm run build

# Start production server
pnpm run start:prod
```

### Testing

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run single test file
pnpm run test -- tests/modules/auth/auth.service.spec.ts

# Run single test with pattern
pnpm run test -- --testNamePattern="signInAsync"

# Run e2e tests
pnpm run test:e2e

# Run with coverage
pnpm run test:cov
```

### Code Quality

```bash
# Type checking
pnpm run typecheck

# Lint and fix
pnpm run lint

# Format code
pnpm run format
```

### Database

```bash
# Generate Prisma client
pnpm exec prisma generate

# Seed database
pnpm run seed

# Run migrations (if needed)
pnpm exec prisma migrate dev
```

### Docker

```bash
# Start with Docker Compose
docker compose -f docker-compose.development.yml up --build -d

# Seed in Docker
docker compose -f docker-compose.development.yml exec api pnpm exec prisma db seed
```

## Code Style Guidelines

### Imports

- Use absolute imports from `src/` for all internal modules
- Group imports: external packages → NestJS modules → internal modules → DTOs/decorators
- Use `import * as bcrypt from 'bcrypt'` for CommonJS modules
- Use named imports for everything else

```typescript
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../iam/users/users.service';
import { UserDto } from '../iam/users/dtos/user.dto';
import { RegisterDto } from './dtos/register.dto';
import { UserPayload } from 'src/common/decorators/current-user.decorator';
import { Result } from 'src/common/logic/result';
```

### Formatting

- **Indentation**: 4 spaces (configured in `.prettierrc`)
- **Quotes**: Single quotes (`'`)
- **Trailing commas**: Always
- **Line endings**: Auto (LF on Unix, CRLF on Windows)
- **Max line length**: 80-100 characters (prettier default)

### TypeScript & Types

- **Strict mode**: Enabled with `strictNullChecks: true`
- **Target**: ES2023
- **Module**: `nodenext` (ESM with Node.js compatibility)
- **No `any`**: Allowed but discouraged; use proper types when possible
- **Explicit return types**: Required for service methods
- **DTOs**: Always use class-based DTOs with `class-validator` decorators

### Naming Conventions

- **Classes**: PascalCase (`AuthService`, `EmployeeCreateDto`)
- **Methods**: camelCase (`signInAsync`, `findOneByIdAsync`)
- **Variables**: camelCase (`userId`, `prismaService`)
- **Constants**: UPPER_SNAKE_CASE (`APP_URL`)
- **Files**:
    - Services: `auth.service.ts`
    - Controllers: `auth.controller.ts`
    - DTOs: `auth.dto.ts` or `auth-response.dto.ts`
    - Modules: `auth.module.ts`
    - Guards: `auth.guard.ts`
    - Interceptors: `transform.interceptor.ts`
    - Filters: `http-exception.filter.ts`
    - Decorators: `current-user.decorator.ts`
- **Test files**: `*.spec.ts` or `*.feature.spec.ts`
- **Test directories**: `tests/` (not `src/`)

### Error Handling

- **Custom exceptions**: Use custom exception classes in `src/common/exceptions/`
    - `NotFoundException` - Resource not found
    - `ConflictException` - Business rule violation
    - `UnauthorizedException` - Authentication failures
    - `BusinessErrorException` - Custom business errors
- **Result pattern**: Services return `Result<T>` for business logic
    - `Result.ok(value)` - Success with data
    - `Result.fail(error)` - Failure with error message
    - `Result.notFound()` - Resource not found
- **Exception filters**: Global filters handle HTTP exceptions
    - `PrismaExceptionFilter` - Database errors
    - `HttpExceptionFilter` - General HTTP errors
- **Logging**: Use NestJS `Logger` with contextual data
    ```typescript
    private readonly logger = new Logger(AuthService.name);
    this.logger.log('Signing in user with {email}.', email);
    this.logger.warn('Invalid credentials attempt');
    ```

### Controllers

- **Decorators**: Use `@Controller('auth')` with path prefix
- **HTTP methods**: `@Post()`, `@Get()`, `@Put()`, `@Patch()`, `@Delete()`
- **Status codes**: Use `@HttpCode(HttpStatus.OK)` for non-default responses
- **Validation**: DTOs are automatically validated via `ValidationPipe`
- **Swagger**: Use `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`
- **Throttling**: Use `@Throttle()` for rate limiting
- **Authentication**: Use `@Auth()` custom decorator for protected routes
- **Current user**: Use `@CurrentUser('sub') userId: string` to get user ID

### Services

- **Async methods**: Use `Async` suffix (`signInAsync`, `createAsync`)
- **Return types**: Explicitly typed with `Promise<Result<T>>`
- **Prisma**: Inject `PrismaService` and use `prisma.client`
- **Business logic**: Keep services focused on single responsibility
- **Validation**: Validate before database operations
- **Timing attacks**: Use dummy hashes for password comparison

### DTOs

- **Naming**: `*.dto.ts` for single, `*.response.dto.ts` for responses
- **Validation**: Use `class-validator` decorators
- **Swagger**: Use `@ApiProperty()` for API documentation
- **Optional fields**: Use `@IsOptional()` decorator
- **Example values**: Provide examples in `@ApiProperty()`

### Guards & Decorators

- **Guards**: `src/common/guards/`
    - `JwtAuthGuard` - JWT authentication
    - `RolesGuard` - Role-based access control
    - `SelfGuard` - Self-resource access
    - `ManagerGuard` - Manager-subordinate access
- **Decorators**: `src/common/decorators/`
    - `@Auth()` - Authentication + role check
    - `@Roles(...)` - Role specification
    - `@CurrentUser()` - Get current user from request
    - `@Match()` - Field matching validation

### Prisma Schema

- **UUID**: Use `@default(uuid())` for all IDs
- **Soft deletes**: Use `isDeleted`, `isActive`, `deletedAt` pattern
- **Audit trail**: `performBy`, `performer` relations for tracking
- **Timestamps**: `createdAt`, `updatedAt` with `@map()` for snake_case
- **Indexing**: Add indexes for frequently queried fields
- **Decimal precision**: Use `Decimal(12, 2)` for money, `Decimal(10, 6)` for rates

### Tests

- **Location**: `tests/` directory (mirrors `src/` structure)
- **Unit tests**: `*.service.spec.ts` - Test service methods
- **Feature tests**: `*.feature.spec.ts` - Test controller endpoints
- **Mocking**: Use Jest mocks for dependencies
- **Test data**: Use realistic fixtures
- **Naming**: `describe('AuthService', ...)` and `it('should ...')`
- **Async tests**: Use `async/await` or return promises
- **Assertions**: Use Jest matchers (`expect`, `toBe`, `rejects.toThrow`)

### Environment & Configuration

- **Environment variables**: Use `@nestjs/config`
- **Port**: Default `3001` (configurable via `PORT` env)
- **CORS**: Configured for `NEXT_APP_URL` or `http://localhost:3000`
- **Swagger**: Available at `/api/swagger`
- **Global prefix**: `/api`

### Security

- **Helmet**: Enabled for security headers
- **Rate limiting**: Applied via `@nestjs/throttler`
- **Password hashing**: `bcrypt` with salt rounds (10)
- **JWT**: Used for authentication with `@nestjs/jwt`
- **Timing attack prevention**: Always compare passwords even if user not found

### Common Patterns

- **Result pattern**: Services return `Result<T>` instead of throwing
- **Controller transformation**: Controllers convert `Result` to HTTP responses
- **Soft deletes**: Filter by `isDeleted: false` and `isActive: true`
- **Audit logging**: Track `performBy` and `performer` on create/update
- **Pagination**: Use `PaginationDto` and `PaginatedResponseDto`

### Module Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dtos/
│   │       ├── login.dto.ts
│   │       └── response.dto.ts
│   └── employees/
│       ├── employees.controller.ts
│       ├── employees.service.ts
│       ├── employees.module.ts
│       └── dtos/
│           ├── employee-create.dto.ts
│           └── employee.dto.ts
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── exceptions/
│   ├── services/
│   ├── logic/
│   └── dto/
├── config/
├── filters/
└── main.ts
```

### Important Notes

- **No comments**: Code should be self-documenting; avoid inline comments
- **No `any`**: Use proper types; `any` is allowed but discouraged
- **Async/await**: Prefer over `.then()` chains
- **Error messages**: Be specific and helpful for debugging
- **Logging**: Use structured logging with context fields
- **TypeScript**: Use strict mode; fix all type errors before committing
- **Prisma**: Always run `pnpm exec prisma generate` after schema changes
- **Tests**: Run `pnpm run test` before committing changes
- **Linting**: Run `pnpm run lint --fix` to auto-fix issues
- **Formatting**: Run `pnpm run format` to ensure consistent style

### CI/CD

- **GitHub Actions**: Runs on PR and push to main
- **Steps**: Install → Generate Prisma → Type check → Lint → Test → Build
- **Node version**: 20
- **Package manager**: pnpm

### Quick Reference

- **Single test**: `pnpm run test -- tests/path/to/test.spec.ts`
- **Test pattern**: `pnpm run test -- --testNamePattern="pattern"`
- **Type check**: `pnpm run typecheck`
- **Lint**: `pnpm run lint`
- **Format**: `pnpm run format`
- **Build**: `pnpm run build`
- **Dev server**: `pnpm run start:dev`
- **Swagger**: `http://localhost:3001/api/swagger`
