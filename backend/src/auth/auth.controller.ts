import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(response: Response, token: string) {
    const { name, ...options } = this.authService.getRefreshCookieOptions();
    response.cookie(name, token, options);
  }

  private clearRefreshCookie(response: Response) {
    const { name, ...options } = this.authService.getRefreshCookieOptions();
    response.clearCookie(name, options);
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);
    this.setRefreshCookie(response, refreshToken);
    return { message: 'Đăng ký thành công', data: { user, accessToken } };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);
    this.setRefreshCookie(response, refreshToken);
    return { message: 'Đăng nhập thành công', data: { user, accessToken } };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieName = this.authService.getRefreshCookieOptions().name;
    const rawToken = (request.cookies as Record<string, string> | undefined)?.[
      cookieName
    ];

    const { user, accessToken, refreshToken } =
      await this.authService.refresh(rawToken);
    this.setRefreshCookie(response, refreshToken);
    return {
      message: 'Làm mới phiên đăng nhập thành công',
      data: { user, accessToken },
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieName = this.authService.getRefreshCookieOptions().name;
    const rawToken = (request.cookies as Record<string, string> | undefined)?.[
      cookieName
    ];

    await this.authService.logout(rawToken);
    this.clearRefreshCookie(response);
    return { message: 'Đăng xuất thành công', data: null };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch('change-password')
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const data = await this.authService.me(user.id);
    return { message: 'Lấy thông tin tài khoản thành công', data };
  }
}
