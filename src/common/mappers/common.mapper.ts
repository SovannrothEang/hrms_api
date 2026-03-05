/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';
import { EmployeeDto } from 'src/modules/employees/dtos/employee.dto';
import { DepartmentDto } from 'src/modules/departments/dtos/department.dto';
import { EmployeePositionDto } from 'src/modules/employee-positions/dtos/employee-position.dto';
import { AttendanceDto } from 'src/modules/attendances/dtos/attendance.dto';
import { LeaveRequestDto } from 'src/modules/leaves/dtos/leave-request.dto';
import { RoleDto } from 'src/modules/iam/roles/dtos/roles.dto';
import { ShiftDto } from 'src/modules/shifts/dtos/shift.dto';
import {
    PayrollDto,
    TaxCalculationDto,
} from 'src/modules/payroll/payrolls/dtos/payroll.dto';
import { PayrollItemDto } from 'src/modules/payroll/payrolls/dtos/payroll-item.dto';
import { CurrencyDto } from 'src/modules/payroll/currencies/dtos/currency.dto';
import { PublicHolidayDto } from 'src/modules/public-holidays/dtos/public-holiday.dto';
import { TaxBracketDto } from 'src/modules/payroll/tax-brackets/dtos/tax-bracket.dto';
import { DecimalNumber } from 'src/config/decimal-number';

export class CommonMapper {
    static mapToUserDto(u: any): UserDto | null {
        if (!u) return null;
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            profileImage: u.profileImage || null,
            roles:
                u.userRoles?.map((ur: any) => ur.role?.name || ur.roleName) ||
                [],
            employees: u.employee ? this.mapToEmployeeDto(u.employee) : null,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        } as any;
    }

    static mapToEmployeeDto(e: any): EmployeeDto | null {
        if (!e) return null;
        return {
            id: e.id,
            employeeCode: e.employeeCode,
            firstname: e.firstname,
            lastname: e.lastname,
            gender:
                e.gender === 0 ? 'male' : e.gender === 1 ? 'female' : 'unknown',
            dateOfBirth: e.dob?.toISOString().split('T')[0],
            userId: e.userId,
            user: e.user ? this.mapToUserDto(e.user) : null,
            address: e.address,
            phoneNumber: e.phone,
            profileImage: e.user?.profileImage || null,
            hireDate: e.hireDate,
            positionId: e.positionId,
            position: e.position ? this.mapToPositionDto(e.position) : null,
            departmentId: e.departmentId,
            department: e.department
                ? this.mapToDepartmentDto(e.department)
                : null,
            employmentType: e.employmentType,
            status: e.status,
            salary: e.salary ? new DecimalNumber(e.salary) : null,
            emergencyContact: e.emergencyContact,
            bankDetails: e.bankDetails,
            isActive: e.isActive,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
        } as any;
    }

    static mapToDepartmentDto(d: any): DepartmentDto | null {
        if (!d) return null;
        return {
            id: d.id,
            name: d.departmentName,
            description: d.description,
            employees: d.employees?.map((e: any) => this.mapToEmployeeDto(e)),
            employeeCount: d._count?.employees ?? 0,
            performBy: d.performBy,
            performer: d.performer ? this.mapToUserDto(d.performer) : null,
            isActive: d.isActive,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
        } as any;
    }

    static mapToPositionDto(p: any): EmployeePositionDto | null {
        if (!p) return null;
        return {
            id: p.id,
            title: p.title,
            description: p.description,
            salaryRangeMin: p.salaryRangeMin
                ? new DecimalNumber(p.salaryRangeMin)
                : null,
            salaryRangeMax: p.salaryRangeMax
                ? new DecimalNumber(p.salaryRangeMax)
                : null,
            employeeCount: p._count?.employees ?? 0,
            employees: p.employees?.map((e: any) => this.mapToEmployeeDto(e)),
            performBy: p.performBy,
            performer: p.performer ? this.mapToUserDto(p.performer) : null,
            isActive: p.isActive,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        } as any;
    }

    static mapToAttendanceDto(a: any): AttendanceDto | null {
        if (!a) return null;
        return {
            id: a.id,
            employeeId: a.employeeId,
            status: a.status,
            date: a.date,
            checkInTime: a.checkInTime,
            checkOutTime: a.checkOutTime,
            checkInOccurredAt: a.checkInOccurredAt,
            checkOutOccurredAt: a.checkOutOccurredAt,
            clientTimezone: a.clientTimezone,
            workHours: a.workHours ? new DecimalNumber(a.workHours) : null,
            overtime: a.overtime ? new DecimalNumber(a.overtime) : null,
            notes: a.notes,
            performBy: a.performBy,
            performer: a.performer ? this.mapToUserDto(a.performer) : null,
            employee: a.employee ? this.mapToEmployeeDto(a.employee) : null,
            isActive: a.isActive,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
        } as any;
    }

    static mapToLeaveRequestDto(l: any): LeaveRequestDto | null {
        if (!l) return null;
        return {
            id: l.id,
            employeeId: l.employeeId,
            approvedBy: l.approvedBy,
            startDate: l.startDate,
            endDate: l.endDate,
            leaveType: l.leaveType,
            status: l.status,
            requestDate: l.requestDate,
            reason: l.reason,
            employee: l.requester
                ? this.mapToEmployeeDto(l.requester)
                : l.employee
                  ? this.mapToEmployeeDto(l.employee)
                  : null,
            approver: l.approver ? this.mapToEmployeeDto(l.approver) : null,
            performBy: l.performBy,
            performer: l.performer ? this.mapToUserDto(l.performer) : null,
            isActive: l.isActive,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
        } as any;
    }

    static mapToRoleDto(r: any): RoleDto | null {
        if (!r) return null;
        return {
            id: r.id,
            name: r.name,
            isActive: r.isActive,
            performBy: r.performBy,
            performer: r.performer ? this.mapToUserDto(r.performer) : null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        } as any;
    }

    static mapToShiftDto(s: any): ShiftDto | null {
        if (!s) return null;
        return {
            id: s.id,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            gracePeriodMins: s.gracePeriodMins,
            description: s.description,
            isActive: s.isActive,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        } as any;
    }

    static mapToPayrollDto(p: any): PayrollDto | null {
        if (!p) return null;
        return {
            id: p.id,
            employeeId: p.employeeId,
            employee: p.employee ? this.mapToEmployeeDto(p.employee) : null,
            currencyCode: p.currencyCode,
            baseCurrencyCode: p.baseCurrencyCode,
            payPeriodStart: p.payPeriodStart,
            payPeriodEnd: p.payPeriodEnd,
            paymentDate: p.paymentDate,
            basicSalary: new DecimalNumber(p.basicSalary),
            overtimeHrs: new DecimalNumber(p.overtimeHrs),
            overtimeRate: new DecimalNumber(p.overtimeRate),
            bonus: new DecimalNumber(p.bonus),
            deductions: new DecimalNumber(p.deductions),
            netSalary: new DecimalNumber(p.netSalary),
            status: p.status,
            exchangeRate: p.exchangeRate
                ? new DecimalNumber(p.exchangeRate)
                : null,
            baseCurrencyAmount: p.baseCurrencyAmount
                ? new DecimalNumber(p.baseCurrencyAmount)
                : null,
            processedAt: p.processedAt,
            items: p.items?.map((item: any) => this.mapToPayrollItemDto(item)),
            taxCalculation: p.taxCalculation
                ? this.mapToTaxCalculationDto(p.taxCalculation)
                : undefined,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        } as any;
    }

    static mapToPayrollItemDto(item: any): PayrollItemDto | null {
        if (!item) return null;
        return {
            id: item.id,
            payrollId: item.payrollId,
            itemType: item.itemType,
            itemName: item.itemName,
            amount: new DecimalNumber(item.amount),
            currencyCode: item.currencyCode,
            description: item.description,
        } as any;
    }

    static mapToTaxCalculationDto(tc: any): TaxCalculationDto | null {
        if (!tc) return null;
        return {
            id: tc.id,
            grossIncome: new DecimalNumber(tc.grossIncome),
            taxableIncome: new DecimalNumber(tc.taxableIncome),
            taxAmount: new DecimalNumber(tc.taxAmount),
            taxRateUsed: new DecimalNumber(tc.taxRateUsed),
            taxBracketId: tc.taxBracketId,
        } as any;
    }

    static mapToCurrencyDto(c: any): CurrencyDto | null {
        if (!c) return null;
        return {
            id: c.id,
            code: c.code,
            name: c.name,
            symbol: c.symbol,
            country: c.country,
            isActive: c.isActive,
        } as any;
    }

    static mapToPublicHolidayDto(h: any): PublicHolidayDto | null {
        if (!h) return null;
        return {
            id: h.id,
            name: h.name,
            date: h.date,
            isRecurring: h.isRecurring,
        } as any;
    }

    static mapToTaxBracketDto(tb: any): TaxBracketDto | null {
        if (!tb) return null;
        return {
            id: tb.id,
            currencyCode: tb.currencyCode,
            countryCode: tb.countryCode,
            taxYear: tb.taxYear,
            bracketName: tb.bracketName,
            minAmount: new DecimalNumber(tb.minAmount),
            maxAmount: new DecimalNumber(tb.maxAmount),
            taxRate: new DecimalNumber(tb.taxRate),
            fixedAmount: new DecimalNumber(tb.fixedAmount),
        } as any;
    }
}
