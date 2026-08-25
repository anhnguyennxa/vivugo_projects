import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { Role } from '../../../generated/prisma/enums';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
