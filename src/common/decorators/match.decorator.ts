import {
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';

export class MatchDecorator implements ValidatorConstraintInterface {
  validate(value: unknown, args?: ValidationArguments) {
    const [relatedPropertyName] = (args?.constraints || []) as string[];
    const relatedValue = (args?.object as Record<string, unknown>)[
      relatedPropertyName
    ];

    return value === relatedValue;
  }

  defaultMessage?(args?: ValidationArguments): string {
    const [relatedPropertyName] = (args?.constraints || []) as string[];
    return `${args?.property} must match ${relatedPropertyName}`;
  }
}
