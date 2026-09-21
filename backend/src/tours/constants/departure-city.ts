export const DEPARTURE_CITIES = [
  'HA_NOI',
  'HO_CHI_MINH',
  'DA_NANG',
  'HAI_PHONG',
  'CAN_THO',
] as const;

export type DepartureCity = (typeof DEPARTURE_CITIES)[number];
