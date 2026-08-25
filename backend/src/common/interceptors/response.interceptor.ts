import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result) => {
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
