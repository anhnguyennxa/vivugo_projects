import { plainToInstance } from 'class-transformer'
import { IsIn, IsInt, IsString, MinLength, validateSync } from 'class-validator'

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development'

  @IsInt()
  PORT: number = 3000

  @IsString()
  @MinLength(1)
  DATABASE_URL: string

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET phải dài tối thiểu 32 ký tự' })
  JWT_ACCESS_SECRET: string

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET phải dài tối thiểu 32 ký tự' })
  JWT_REFRESH_SECRET: string

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m'

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d'

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:5173'
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validated, { skipMissingProperties: false })

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('\n  - ')
    throw new Error(`Biến môi trường không hợp lệ:\n  - ${messages}`)
  }

  return validated
}
