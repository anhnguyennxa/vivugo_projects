import { Controller, Get } from '@nestjs/common'

import { PrismaService } from './database/prisma/prisma.service'

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`
    return { message: 'VivuGo API khỏe mạnh', data: { status: 'ok', database: 'connected' } }
  }
}
