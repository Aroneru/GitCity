import type { PlacedBuilding } from './city/types';

/** Display helpers shared by the panels, tooltip and directory. */

const KIND_LABEL: Record<PlacedBuilding['kind'], string> = {
  shop: 'shop',
  midrise: 'mid-rise',
  tower: 'tower',
  izakaya: 'izakaya',
};

const WIDTH_LABEL: Record<PlacedBuilding['widthTier'], string> = { S: 'narrow', M: 'medium width', L: 'wide' };

const ROOFTOP_LABEL: Record<PlacedBuilding['rooftop'], string | null> = {
  none: null,
  antenna: 'antenna (10★+)',
  billboard: 'billboard (100★+)',
  beacon: 'red beacon (1000★+)',
};

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en', { notation: value >= 100_000 ? 'compact' : 'standard' }).format(value);
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'never';
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

export function kindLabel(kind: PlacedBuilding['kind']): string {
  return KIND_LABEL[kind];
}

export function storeys(floors: number): string {
  return `${floors} ${floors === 1 ? 'floor' : 'floors'}`;
}

/** The building in a phrase, e.g. "15-floor tower · wide · red beacon (1000★+)". */
export function describeBuilding(b: Pick<PlacedBuilding, 'kind' | 'floors' | 'widthTier' | 'rooftop'>): string {
  const parts = [`${b.floors}-floor ${KIND_LABEL[b.kind]}`, WIDTH_LABEL[b.widthTier], ROOFTOP_LABEL[b.rooftop]];
  return parts.filter(Boolean).join(' · ');
}
