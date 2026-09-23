import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Audit } from '../common/decorators/audit.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: QueryNotificationsDto,
  ) {
    const { items, page, limit, total } =
      await this.notificationsService.findAllForUser(user.id, query);
    return {
      message: 'Lấy danh sách thông báo thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { message: 'Lấy số thông báo chưa đọc thành công', data: { count } };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const data = await this.notificationsService.markAsRead(user.id, id);
    return { message: 'Đã đánh dấu đã đọc', data };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { message: 'Đã đánh dấu tất cả đã đọc', data: null };
  }

  @Roles(Role.ADMIN)
  @Audit('Notification', 'BROADCAST')
  @Post('broadcast')
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const data = await this.notificationsService.broadcast(dto);
    return { message: 'Đã gửi thông báo', data };
  }
}
