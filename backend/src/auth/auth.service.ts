import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../database/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_COOKIE_NAME = 'refresh_token';
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return value * unit;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private toPublicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }

  private signAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn:
          parseDurationMs(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') / 1000,
      },
    );
  }

  private async issueRefreshToken(userId: string) {
    const expiresInMs = parseDurationMs(
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    );
    const expiresAt = new Date(Date.now() + expiresInMs);

    const record = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: randomBytes(32).toString('hex'), expiresAt },
    });

    const token = this.jwt.sign(
      { sub: userId, rid: record.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: expiresInMs / 1000 },
    );

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash: sha256(token) },
    });

    return token;
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
    });

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const invalidCredentials = () =>
      new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (!user || user.deletedAt) throw invalidCredentials();

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches) throw invalidCredentials();

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản đã bị khoá, vui lòng liên hệ hỗ trợ',
      );
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('Thiếu refresh token');

    let payload: { sub: string; rid: string };
    try {
      payload = this.jwt.verify(rawToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.rid },
    });
    const invalid = () =>
      new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt < new Date() ||
      record.tokenHash !== sha256(rawToken) ||
      record.userId !== payload.sub
    ) {
      throw invalid();
    }

    const user = await this.users.findById(record.userId);
    if (!user || !user.isActive || user.deletedAt) throw invalid();

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;

    try {
      const payload = this.jwt.verify<{ rid: string }>(rawToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.rid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // token đã hết hạn/không hợp lệ — không cần thu hồi
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);

    if (user && !user.deletedAt) {
      const rawToken = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordTokenHash: sha256(rawToken),
          resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      await this.mail.sendPasswordReset(user.email, resetUrl);
    }

    return {
      message:
        'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi',
      data: null,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordTokenHash: null,
          resetPasswordExpiresAt: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại',
      data: null,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    const matches = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại',
      data: null,
    };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }

  getRefreshCookieOptions() {
    return { name: REFRESH_COOKIE_NAME, ...this.cookieOptions() };
  }
}
