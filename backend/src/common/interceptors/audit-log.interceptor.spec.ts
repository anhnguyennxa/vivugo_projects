import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';

import { AuditLogInterceptor } from './audit-log.interceptor';
import type { AuditMeta } from '../decorators/audit.decorator';

interface CreatedLogArg {
  data: {
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    ipAddress: string;
  };
}

function lastCreateArg(
  create: jest.Mock<Promise<undefined>, [CreatedLogArg]>,
): CreatedLogArg {
  const [firstCall] = create.mock.calls;
  return firstCall[0];
}

function makeContext(
  params: Record<string, unknown>,
  user?: { id: string },
): ExecutionContext {
  return {
    getHandler: () => (() => undefined) as unknown,
    switchToHttp: () => ({
      getRequest: () => ({ params, user, ip: '127.0.0.1' }),
    }),
  } as unknown as ExecutionContext;
}

function makeCallHandler(result: unknown): CallHandler {
  return { handle: () => of(result) } as CallHandler;
}

describe('AuditLogInterceptor', () => {
  let create: jest.Mock<Promise<undefined>, [CreatedLogArg]>;
  let getMeta: jest.Mock;
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    create = jest
      .fn<Promise<undefined>, [CreatedLogArg]>()
      .mockResolvedValue(undefined);
    getMeta = jest.fn();
    const reflector = { get: getMeta } as unknown as Reflector;
    const prisma = { auditLog: { create } } as never;
    interceptor = new AuditLogInterceptor(reflector, prisma);
  });

  it('không có @Audit trên handler thì bỏ qua, không ghi log', async () => {
    getMeta.mockReturnValue(undefined);
    const context = makeContext({});
    const handler = makeCallHandler({ message: 'ok', data: null });

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({ message: 'ok', data: null });
    expect(create).not.toHaveBeenCalled();
  });

  it('lấy entityId từ route param mặc định "id"', async () => {
    const meta: AuditMeta = { entity: 'Tour', action: 'UPDATE' };
    getMeta.mockReturnValue(meta);
    const context = makeContext({ id: 'tour-123' }, { id: 'admin-1' });
    const handler = makeCallHandler({
      message: 'ok',
      data: { id: 'tour-123', title: 'X' },
    });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'UPDATE',
        entity: 'Tour',
        entityId: 'tour-123',
        ipAddress: '127.0.0.1',
      },
    });
  });

  it('lấy entityId theo paramKey tuỳ chỉnh (VD bookingId cho hoàn tiền)', async () => {
    const meta: AuditMeta = {
      entity: 'Payment',
      action: 'REFUND',
      paramKey: 'bookingId',
    };
    getMeta.mockReturnValue(meta);
    const context = makeContext({ bookingId: 'booking-9' }, { id: 'admin-1' });
    const handler = makeCallHandler({ message: 'ok', data: null });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(lastCreateArg(create).data.entityId).toBe('booking-9');
  });

  it('không có param khớp thì lấy entityId từ data.id trong response (VD tạo mới)', async () => {
    const meta: AuditMeta = { entity: 'Category', action: 'CREATE' };
    getMeta.mockReturnValue(meta);
    const context = makeContext({}, { id: 'admin-1' });
    const handler = makeCallHandler({
      message: 'ok',
      data: { id: 'cat-new-1' },
    });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(lastCreateArg(create).data.entityId).toBe('cat-new-1');
  });

  it('không có param lẫn data.id thì entityId là "unknown" (VD broadcast)', async () => {
    const meta: AuditMeta = { entity: 'Notification', action: 'BROADCAST' };
    getMeta.mockReturnValue(meta);
    const context = makeContext({}, { id: 'admin-1' });
    const handler = makeCallHandler({ message: 'ok', data: { count: 5 } });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(lastCreateArg(create).data.entityId).toBe('unknown');
  });

  it('param dạng mảng (Express) thì lấy phần tử đầu tiên', async () => {
    const meta: AuditMeta = { entity: 'Tour', action: 'DELETE' };
    getMeta.mockReturnValue(meta);
    const context = makeContext(
      { id: ['tour-1', 'tour-2'] },
      { id: 'admin-1' },
    );
    const handler = makeCallHandler({ message: 'ok', data: null });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(lastCreateArg(create).data.entityId).toBe('tour-1');
  });

  it('ghi log lỗi không được làm hỏng response gốc', async () => {
    create.mockRejectedValue(new Error('DB down'));
    const meta: AuditMeta = { entity: 'Tour', action: 'UPDATE' };
    getMeta.mockReturnValue(meta);
    const context = makeContext({ id: 'tour-1' }, { id: 'admin-1' });
    const handler = makeCallHandler({ message: 'ok', data: { id: 'tour-1' } });

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({ message: 'ok', data: { id: 'tour-1' } });
  });

  it('handler gốc lỗi thì lỗi vẫn được ném ra bình thường, không bị nuốt', async () => {
    const meta: AuditMeta = { entity: 'Tour', action: 'UPDATE' };
    getMeta.mockReturnValue(meta);
    const context = makeContext({ id: 'tour-1' }, { id: 'admin-1' });
    const handler = {
      handle: () => throwError(() => new Error('Not found')),
    } as CallHandler;

    await expect(
      firstValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toThrow('Not found');
    expect(create).not.toHaveBeenCalled();
  });
});
