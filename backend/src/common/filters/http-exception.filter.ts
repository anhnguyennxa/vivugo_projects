import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.resolve(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    body: ApiErrorResponse;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, body: { success: false, message: payload } };
      }

      if (typeof payload === 'object' && payload !== null) {
        const { message, errors } = payload as {
          message?: string;
          errors?: FieldError[];
        };
        return {
          status,
          body: {
            success: false,
            message: message ?? exception.message,
            ...(errors ? { errors } : {}),
          },
        };
      }

      return { status, body: { success: false, message: exception.message } };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            message: 'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
          },
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          body: { success: false, message: 'Không tìm thấy dữ liệu' },
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        message: 'Đã có lỗi xảy ra ở máy chủ, vui lòng thử lại sau',
      },
    };
  }
}
