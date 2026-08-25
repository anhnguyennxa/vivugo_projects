import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CartService } from './cart.service';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    const data = await this.cartService.findAll(user.id);
    return { message: 'Lấy giỏ hàng thành công', data };
  }

  @Post()
  async add(@CurrentUser() user: RequestUser, @Body() dto: AddCartItemDto) {
    const data = await this.cartService.add(user.id, dto);
    return { message: 'Thêm vào giỏ hàng thành công', data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const data = await this.cartService.update(user.id, id, dto);
    return { message: 'Cập nhật giỏ hàng thành công', data };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.cartService.remove(user.id, id);
    return { message: 'Xoá khỏi giỏ hàng thành công', data: null };
  }
}
