import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Số tầng reverse proxy đứng trước app (VD 1 khi sau Caddy). Không có thì
  // request.ip là IP của proxy: audit log/IP gửi VNPay sai và rate limit gộp
  // mọi người dùng thành 1 IP. Mặc định 0 (chạy trực tiếp, không proxy).
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`VivuGo API đang chạy tại http://localhost:${port}/api`);
}
void bootstrap();
