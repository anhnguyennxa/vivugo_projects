import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';

import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((result) => {
        if (isRaw) return result;

        const payload = result as unknown as {
          data?: T;
          message?: string;
          meta?: Record<string, unknown>;
        };
        const hasEnvelope =
          payload && typeof payload === 'object' && 'data' in payload;

        return {
          success: true,
          message:
            hasEnvelope && payload.message ? payload.message : 'Thành công',
          data: hasEnvelope ? (payload.data as T) : result,
          ...(hasEnvelope && payload.meta ? { meta: payload.meta } : {}),
        };
      }),
    );
  }
}
