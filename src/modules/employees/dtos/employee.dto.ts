import { Expose, Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export class EmployeeDto {
  @Expose({ name: 'id' })
  id: string;

  @Expose({ name: 'employee_code' })
  code: string;

  @Expose({ name: 'firstname' })
  firstname: string;

  @Expose({ name: 'lastname' })
  lastname: string;

  @Expose({ name: 'gender' })
  @Transform(({ obj }) => {
    if (isNaN(obj.gender))
      throw new BadRequestException('Gender must be an integer');

    try {
      const parsed = parseInt(obj.gender, 10);
      switch (parsed) {
        case 0:
          return 'male';
        case 1:
          return 'female';
        default:
          return 'unknown';
      }
    } catch (e) {
      throw new BadRequestException(e);
    }
  })
  gender: string;

  @Expose({ name: 'dob' })
  @Transform(({ obj }) => {
    return obj.dob.toString();
  })
  dateOfBirth: string;

  @Expose({ name: 'address' })
  address: string;

  @Expose({ name: 'phone' })
  phoneNumber: string;

  @Expose({ name: 'hire_date' })
  hireDate: Date;
}
