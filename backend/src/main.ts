import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { validationExceptionFactory } from './common/pipes/validation-exception-factory'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.use(cookieParser())
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  })

  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor())

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`VivuGo API đang chạy tại http://localhost:${port}/api`)
}
bootstrap()
