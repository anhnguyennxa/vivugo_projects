import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  entity: string;
  action: string;
  // Tên route param chứa id của đối tượng bị tác động (mặc định 'id'). Nếu
  // route không có param này (VD: tạo mới), interceptor sẽ lấy `data.id`
  // trong response.
  paramKey?: string;
}

export const Audit = (entity: string, action: string, paramKey?: string) =>
  SetMetadata(AUDIT_KEY, { entity, action, paramKey } satisfies AuditMeta);
