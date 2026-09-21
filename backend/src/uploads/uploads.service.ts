import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  // Đọc biến môi trường ở mỗi lần gọi để đổi cấu hình không cần khởi tạo lại service.
  private isConfigured() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    );
  }

  uploadImage(file: Express.Multer.File): Promise<UploadedImage> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Bạn vẫn có thể dán URL ảnh trực tiếp.',
      );
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'vivugo', resource_type: 'image' },
          (error, result) => {
            if (error || !result) {
              this.logger.error(
                `Upload Cloudinary thất bại: ${error?.message}`,
              );
              reject(
                new ServiceUnavailableException(
                  'Không thể tải ảnh lên, vui lòng thử lại sau',
                ),
              );
              return;
            }
            resolve({ url: result.secure_url, publicId: result.public_id });
          },
        )
        .end(file.buffer);
    });
  }
}
