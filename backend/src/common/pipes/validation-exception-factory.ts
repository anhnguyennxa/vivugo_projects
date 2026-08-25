import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function flatten(
  errors: ValidationError[],
  parentPath = '',
): { field: string; message: string }[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.children && error.children.length > 0) {
      return flatten(error.children, field);
    }

    const message =
      Object.values(error.constraints ?? {})[0] ?? 'Giá trị không hợp lệ';
    return [{ field, message }];
  });
}

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    message: 'Dữ liệu không hợp lệ',
    errors: flatten(errors),
  });
}
