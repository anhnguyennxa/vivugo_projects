import type { DepartureCity } from '@/types/tour'

export const DEPARTURE_CITY_LABELS: Record<DepartureCity, string> = {
  HA_NOI: 'Hà Nội',
  HO_CHI_MINH: 'TP. Hồ Chí Minh',
  DA_NANG: 'Đà Nẵng',
  HAI_PHONG: 'Hải Phòng',
  CAN_THO: 'Cần Thơ',
}

export const DEPARTURE_CITY_OPTIONS: { value: DepartureCity; label: string }[] = (
  Object.entries(DEPARTURE_CITY_LABELS) as [DepartureCity, string][]
).map(([value, label]) => ({ value, label }))
