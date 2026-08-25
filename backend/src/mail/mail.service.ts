import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from =
    process.env.SMTP_FROM ?? 'VivuGo <no-reply@vivugo.vn>';

  constructor() {
    this.transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        })
      : null;
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const subject = 'Đặt lại mật khẩu VivuGo';
    const html = `
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản VivuGo.</p>
      <p><a href="${resetUrl}">Nhấn vào đây để đặt lại mật khẩu</a> (liên kết hết hạn sau 30 phút).</p>
      <p>Nếu không phải bạn, hãy bỏ qua email này.</p>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `SMTP chưa được cấu hình — liên kết đặt lại mật khẩu cho ${to}: ${resetUrl}`,
      );
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}
