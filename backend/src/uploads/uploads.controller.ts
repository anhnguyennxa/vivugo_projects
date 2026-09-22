import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadsService } from './uploads.service';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Không giới hạn ADMIN: mọi người dùng đã đăng nhập (JwtAuthGuard toàn cục)
// đều được upload ảnh, ví dụ đổi ảnh đại diện. Việc gắn ảnh vào tour/bài viết
// vẫn được các endpoint ghi dữ liệu tương ứng kiểm soát quyền riêng.
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(
            new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh để tải lên');
    const data = await this.uploadsService.uploadImage(file);
    return { message: 'Tải ảnh lên thành công', data };
  }
}
