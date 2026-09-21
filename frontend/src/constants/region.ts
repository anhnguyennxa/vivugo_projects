import type { Region } from '@/types/tour'

export const REGION_LABELS: Record<Region, string> = {
  MIEN_BAC: 'Miền Bắc',
  MIEN_TRUNG: 'Miền Trung',
  TAY_NGUYEN: 'Tây Nguyên',
  MIEN_NAM: 'Miền Nam',
}

export const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: 'MIEN_BAC', label: 'Miền Bắc' },
  { value: 'MIEN_TRUNG', label: 'Miền Trung' },
  { value: 'TAY_NGUYEN', label: 'Tây Nguyên' },
  { value: 'MIEN_NAM', label: 'Miền Nam' },
]
