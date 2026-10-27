import type { FoodDistrict } from '../food.types';

export const PHNOM_PENH_CENTER = {
  lat: 11.5564,
  lng: 104.9282,
};

export const PHNOM_PENH_DISTRICTS: FoodDistrict[] = [
  {
    id: 'daun-penh',
    nameKm: 'ដូនពេញ (Daun Penh)',
    nameEn: 'Daun Penh',
    lat: 11.5721,
    lng: 104.9255,
    radiusMeters: 2500,
  },
  {
    id: 'bkk',
    nameKm: 'បឹងកេងកង (Boeng Keng Kang)',
    nameEn: 'Boeng Keng Kang',
    lat: 11.5516,
    lng: 104.9247,
    radiusMeters: 2000,
  },
  {
    id: 'chamkarmon',
    nameKm: 'ចំការមន (Chamkarmon)',
    nameEn: 'Chamkarmon',
    lat: 11.5414,
    lng: 104.9282,
    radiusMeters: 2500,
  },
  {
    id: 'tuol-kork',
    nameKm: 'ទួលគោក (Tuol Kork)',
    nameEn: 'Tuol Kork',
    lat: 11.5714,
    lng: 104.8973,
    radiusMeters: 3000,
  },
  {
    id: '7-makara',
    nameKm: '៧មករា (Prampir Makara)',
    nameEn: 'Prampir Makara',
    lat: 11.5627,
    lng: 104.9142,
    radiusMeters: 2000,
  },
  {
    id: 'sen-sok',
    nameKm: 'សែនសុខ (Sen Sok)',
    nameEn: 'Sen Sok',
    lat: 11.5878,
    lng: 104.8687,
    radiusMeters: 4000,
  },
  {
    id: 'russei-keo',
    nameKm: 'ឫស្សីកែវ (Russei Keo)',
    nameEn: 'Russei Keo',
    lat: 11.6094,
    lng: 104.9085,
    radiusMeters: 4000,
  },
  {
    id: 'chbar-ampov',
    nameKm: 'ច្បារអំពៅ (Chbar Ampov)',
    nameEn: 'Chbar Ampov',
    lat: 11.5312,
    lng: 104.9489,
    radiusMeters: 3500,
  },
  {
    id: 'meanchey',
    nameKm: 'មានជ័យ (Meanchey)',
    nameEn: 'Meanchey',
    lat: 11.5234,
    lng: 104.9056,
    radiusMeters: 4000,
  },
  {
    id: 'chroy-changvar',
    nameKm: 'ជ្រោយចង្វារ (Chroy Changvar)',
    nameEn: 'Chroy Changvar',
    lat: 11.5974,
    lng: 104.9388,
    radiusMeters: 4000,
  },
];

export function findDistrictById(id?: string): FoodDistrict | null {
  if (!id) return null;
  const normalized = id.toLowerCase().trim();
  return PHNOM_PENH_DISTRICTS.find((d) => d.id === normalized) ?? null;
}

/**
 * Haversine formula for calculating distance in kilometers between two lat/lng coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
