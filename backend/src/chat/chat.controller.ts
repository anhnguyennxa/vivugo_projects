import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { ChatService } from './chat.service';
import { QueryChatConversationsDto } from './dto/query-chat-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMyMessages(@CurrentUser() user: RequestUser) {
    const data = await this.chatService.getMyMessages(user.id);
    return { message: 'Lấy hội thoại thành công', data };
  }

  @Post('messages')
  async sendMyMessage(
    @CurrentUser() user: RequestUser,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMyMessage(user.id, dto);
    return { message: 'Đã gửi tin nhắn', data };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.chatService.getMyUnreadCount(user.id);
    return { message: 'Lấy số tin nhắn chưa đọc thành công', data: { count } };
  }

  @Roles(Role.ADMIN)
  @Get('admin/conversations')
  async listConversations(@Query() query: QueryChatConversationsDto) {
    const { items, page, limit, total } =
      await this.chatService.listConversations(query);
    return {
      message: 'Lấy danh sách hội thoại thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Roles(Role.ADMIN)
  @Get('admin/conversations/:id/messages')
  async getConversationMessages(@Param('id') id: string) {
    const data = await this.chatService.getConversationMessages(id);
    return { message: 'Lấy tin nhắn thành công', data };
  }

  @Roles(Role.ADMIN)
  @Post('admin/conversations/:id/messages')
  async sendAdminMessage(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendAdminMessage(admin, id, dto);
    return { message: 'Đã gửi tin nhắn', data };
  }

  @Roles(Role.ADMIN)
  @Patch('admin/conversations/:id/close')
  async closeConversation(@Param('id') id: string) {
    await this.chatService.closeConversation(id);
    return { message: 'Đã đóng hội thoại', data: null };
  }

  @Roles(Role.ADMIN)
  @Get('admin/unread-count')
  async adminUnreadCount() {
    const count = await this.chatService.getAdminUnreadCount();
    return { message: 'Lấy số tin nhắn chưa đọc thành công', data: { count } };
  }
}
