import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { mergeMap, Observable } from 'rxjs';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AUDIT_KEY, type AuditMeta } from '../decorators/audit.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();

    // Chờ ghi log xong trước khi trả response (độ trễ thêm chỉ vài ms, các
    // hành động admin không tần suất cao) — để lỗi ghi log không bao giờ làm
    // hỏng hành động chính, và để test có thể kiểm tra log ngay sau response
    // mà không cần đoán thời điểm ghi xong.
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          const paramValue = request.params?.[meta.paramKey ?? 'id'];
          const entityId =
            (Array.isArray(paramValue) ? paramValue[0] : paramValue) ??
            (result as { data?: { id?: string } } | undefined)?.data?.id ??
            'unknown';

          await this.prisma.auditLog.create({
            data: {
              userId: request.user?.id,
              action: meta.action,
              entity: meta.entity,
              entityId,
              ipAddress: request.ip,
            },
          });
        } catch (err) {
          this.logger.warn(`Ghi audit log thất bại: ${(err as Error).message}`);
        }
        return result;
      }),
    );
  }
}
