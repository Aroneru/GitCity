import type { CitySnapshot, RepoSnapshot } from '../snapshot';
import {
  CROSSING_WIDTH,
  EDGE_MARGIN,
  FIXTURE_WIDTH,
  GEOMETRY,
  PROP_WIDTH,
  UTILITY_POLE_HEIGHT,
  buildingHeight,
  buildingWidth,
  maxHorizontalChars,
  maxVerticalChars,
  type FixtureKind,
  type PropKind,
} from './geometry';
import { toBuildingSpec } from './rules';
import { buildingSeed, citySeed, compareNames, createRng, hash32, type Rng } from './seed';
import { CLOSED_SIGN, pickSignWord } from './signs';
import type { CityLayout, Fixture, PlacedBuilding, Prop, Span } from './types';

/**
 * City layout generation: arranges every repo's building along one street,
 * splits the street into blocks with alleys and crossings, and adds the
 * street furniture. Pure and deterministic for a given snapshot.
 */

type Draft = Omit<PlacedBuilding, 'x'>;
type RowItem = Draft | Draft[];

type Slot =
  | { type: 'building'; draft: Draft }
  | { type: 'space'; width: number; props: PropKind[]; alley: boolean }
  | { type: 'crossing' }
  | { type: 'fixture'; kind: FixtureKind }
  | { type: 'yokocho-start' }
  | { type: 'yokocho-end' };

const MAX_YOKOCHO_SIZE = 8;
const FIXTURE_HEIGHT: Record<FixtureKind, number> = { konbini: 34, yatai: 34, shrine: 46, lot: 30 };
const TRAFFIC_LIGHT_HEIGHT = 46;

const ALLEY_PROPS: readonly PropKind[][] = [
  ['vending'],
  ['vending'],
  ['vending', 'vending'],
  ['bicycles'],
  ['vending', 'bicycles'],
  ['plants'],
  ['crates', 'plants'],
  [],
];

export function generateCity(snapshot: CitySnapshot): CityLayout {
  const nowMs = Date.parse(snapshot.fetchedAt);
  const login = snapshot.owner.login;
  const repos = [...snapshot.repos].sort((a, b) => compareNames(a.name, b.name));
  const seed = citySeed(login, repos.map((repo) => repo.name));
  const rng = createRng(seed);

  const drafts = repos.map((repo) => draftBuilding(repo, login, nowMs));
  const row = arrange(drafts, rng.fork('arrange'));
  const slots = streetSlots(row, rng.fork('street'));
  return place(slots, seed, rng.fork('details'));
}

function draftBuilding(repo: RepoSnapshot, login: string, nowMs: number): Draft {
  const spec = toBuildingSpec(repo, nowMs);
  const seed = buildingSeed(login, repo.name);
  const signRng = createRng(seed).fork('sign');
  const width = buildingWidth(spec.kind, spec.widthTier);
  const height = buildingHeight(spec.kind, spec.floors);
  const vertical = spec.kind === 'midrise' || spec.kind === 'tower';

  let text: string;
  if (vertical) {
    const max = Math.min(4, maxVerticalChars(height));
    const min = Math.min(spec.kind === 'tower' ? 3 : 2, max);
    text = pickSignWord(spec.kind, min, max, signRng);
  } else if (spec.archived) {
    text = CLOSED_SIGN;
  } else {
    text = pickSignWord(spec.kind, 1, Math.min(3, maxHorizontalChars(width)), signRng);
  }

  return {
    ...spec,
    id: repo.name,
    width,
    height,
    seed,
    sign: {
      text,
      orientation: vertical ? 'vertical' : 'horizontal',
      side: 'right',
      lit: !spec.archived,
    },
  };
}

/**
 * Order the buildings: towers drift toward the middle of the street (a noisy
 * height ranking dealt outward from the center), and forks gather into
 * izakaya alleys toward the quieter ends.
 */
function arrange(drafts: Draft[], rng: Rng): RowItem[] {
  const forks = drafts.filter((draft) => draft.kind === 'izakaya');
  const others = drafts.filter((draft) => draft.kind !== 'izakaya');

  const ranked = others
    .map((draft) => ({ draft, key: draft.floors + rng.float(-3, 3) }))
    .sort((a, b) => b.key - a.key || compareNames(a.draft.id, b.draft.id))
    .map(({ draft }) => draft);

  const left: Draft[] = [];
  const right: Draft[] = [];
  let leftWidth = 0;
  let rightWidth = 0;
  for (const draft of ranked) {
    if (leftWidth < rightWidth || (leftWidth === rightWidth && rng.chance(0.5))) {
      left.push(draft);
      leftWidth += draft.width;
    } else {
      right.push(draft);
      rightWidth += draft.width;
    }
  }

  const row: RowItem[] = [...left.reverse(), ...right];
  for (const cluster of chunk(forks, MAX_YOKOCHO_SIZE)) {
    const n = row.length;
    const index = n === 0 ? 0 : rng.chance(0.5) ? rng.int(0, Math.floor(n * 0.3)) : rng.int(Math.ceil(n * 0.7), n);
    row.splice(index, 0, cluster);
  }
  return row;
}

function streetSlots(row: RowItem[], rng: Rng): Slot[] {
  const slots: Slot[] = [edge(['vending'])];
  const buildingCount = row.reduce((n, item) => n + (Array.isArray(item) ? item.length : 1), 0);

  if (buildingCount === 0) {
    slots.push({ type: 'fixture', kind: 'lot' }, space(24, ['bicycles'], true), edge([]));
    return slots;
  }

  let konbiniOwed = buildingCount >= 50 ? 2 : buildingCount >= 6 ? 1 : 0;
  let yataiOwed = true;
  let sinceAlley = 0;
  let sinceCrossing = 0;
  let alleyEvery = rng.int(3, 6);
  let crossingEvery = rng.int(9, 13);

  row.forEach((item, index) => {
    const last = index === row.length - 1;

    if (Array.isArray(item)) {
      slots.push(space(rng.int(6, 10), rng.chance(0.5) ? ['crates'] : [], true), { type: 'yokocho-start' });
      item.forEach((draft, i) => {
        slots.push({ type: 'building', draft });
        if (i < item.length - 1) slots.push(space(rng.int(0, 1), [], false));
      });
      slots.push({ type: 'yokocho-end' });
      if (yataiOwed) {
        slots.push(space(4, [], false), { type: 'fixture', kind: 'yatai' });
        yataiOwed = false;
      }
      if (!last) slots.push(alley(rng));
      sinceAlley = 0;
      return;
    }

    slots.push({ type: 'building', draft: item });
    sinceAlley++;
    sinceCrossing++;
    if (last) return;

    if (sinceCrossing >= crossingEvery) {
      slots.push({ type: 'crossing' });
      if (konbiniOwed > 0) {
        slots.push(space(2, [], false), { type: 'fixture', kind: 'konbini' }, space(3, ['bicycles'], false));
        konbiniOwed--;
      }
      sinceCrossing = 0;
      sinceAlley = 0;
      crossingEvery = rng.int(9, 13);
    } else if (sinceAlley >= alleyEvery) {
      slots.push(alley(rng));
      sinceAlley = 0;
      alleyEvery = rng.int(3, 6);
    } else {
      slots.push(space(rng.pick([0, 0, 1, 1, 2, 3]), [], false));
    }
  });

  // Small cities without a crossing still get their konbini, mid-street.
  if (konbiniOwed > 0) {
    const middle = middleBuildingSlot(slots);
    slots.splice(middle + 1, 0, alley(rng), { type: 'fixture', kind: 'konbini' }, space(3, ['bicycles'], false));
  }

  // A tiny shrine tucked into one of the alleys.
  if (buildingCount >= 4) {
    const alleys = slots.flatMap((slot, i) => (slot.type === 'space' && slot.alley && i > 0 ? [i] : []));
    const shrine: Slot[] = [space(3, [], false), { type: 'fixture', kind: 'shrine' }, space(3, [], false)];
    if (alleys.length > 0) slots.splice(rng.pick(alleys), 1, ...shrine);
    else slots.push(...shrine);
  }
  if (yataiOwed && buildingCount >= 10) {
    const middle = middleBuildingSlot(slots);
    slots.splice(middle + 1, 0, space(4, [], false), { type: 'fixture', kind: 'yatai' }, space(4, [], false));
  }

  slots.push(edge(['bicycles']));
  return slots;
}

function place(slots: Slot[], seed: number, rng: Rng): CityLayout {
  const buildings: PlacedBuilding[] = [];
  const fixtures: Fixture[] = [];
  const props: Prop[] = [];
  const crossings: Span[] = [];
  const yokocho: Span[] = [];
  const detailSeed = (label: string) => hash32(`${seed}:${label}`);

  let x = 0;
  let yokochoStart = 0;
  for (const slot of slots) {
    switch (slot.type) {
      case 'building':
        buildings.push({ ...slot.draft, sign: { ...slot.draft.sign }, x });
        x += slot.draft.width;
        break;
      case 'space': {
        let propX = x + 2;
        for (const kind of slot.props) {
          props.push({ kind, x: propX, seed: detailSeed(`prop:${props.length}`) });
          propX += PROP_WIDTH[kind] + 1;
        }
        x += slot.width;
        break;
      }
      case 'crossing':
        crossings.push({ x, width: CROSSING_WIDTH });
        props.push(
          { kind: 'trafficLight', x: x + 2, seed: detailSeed(`prop:${props.length}`) },
          { kind: 'trafficLight', x: x + CROSSING_WIDTH - 2 - PROP_WIDTH.trafficLight, seed: detailSeed(`prop:${props.length + 1}`) },
        );
        x += CROSSING_WIDTH;
        break;
      case 'fixture':
        fixtures.push({ kind: slot.kind, x, width: FIXTURE_WIDTH[slot.kind], seed: detailSeed(`fixture:${fixtures.length}`) });
        x += FIXTURE_WIDTH[slot.kind];
        break;
      case 'yokocho-start':
        yokochoStart = x;
        break;
      case 'yokocho-end':
        yokocho.push({ x: yokochoStart, width: x - yokochoStart });
        break;
    }
  }
  const width = x;

  assignSignSides(buildings, rng.fork('signs'));
  placeUtilityPoles(props, crossings, width, rng.fork('poles'), detailSeed);

  const skylineHeight = Math.max(
    UTILITY_POLE_HEIGHT,
    crossings.length > 0 ? TRAFFIC_LIGHT_HEIGHT : 0,
    ...buildings.map((b) => b.height + GEOMETRY.rooftopExtra[b.rooftop]),
    ...fixtures.map((f) => FIXTURE_HEIGHT[f.kind]),
  );

  return { seed, width, buildings, fixtures, props, crossings, yokocho, skylineHeight };
}

/** Vertical signs on neighbouring buildings never share an edge. */
function assignSignSides(buildings: PlacedBuilding[], rng: Rng): void {
  let previous: PlacedBuilding | null = null;
  for (const building of buildings) {
    if (building.sign.orientation !== 'vertical') {
      previous = building;
      continue;
    }
    const touchesPrevious =
      previous !== null &&
      previous.sign.orientation === 'vertical' &&
      previous.sign.side === 'right' &&
      building.x - (previous.x + previous.width) < 8;
    building.sign.side = touchesPrevious ? 'right' : rng.chance(0.5) ? 'left' : 'right';
    previous = building;
  }
}

/** Utility poles along the curb every 100–150px, never standing in a side street. */
function placeUtilityPoles(
  props: Prop[],
  crossings: Span[],
  width: number,
  rng: Rng,
  detailSeed: (label: string) => number,
): void {
  let x = 16 + rng.int(0, 24);
  while (x < width - 20) {
    const crossing = crossings.find((c) => x >= c.x - PROP_WIDTH.pole && x <= c.x + c.width);
    const poleX = crossing ? crossing.x - PROP_WIDTH.pole - 1 : x;
    props.push({ kind: 'pole', x: poleX, seed: detailSeed(`pole:${props.length}`) });
    x = Math.max(poleX, x) + rng.int(104, 150);
  }
}

function edge(props: PropKind[]): Slot {
  return space(EDGE_MARGIN, props, false);
}

function space(width: number, props: PropKind[], alley: boolean): Slot {
  return { type: 'space', width, props, alley };
}

function alley(rng: Rng): Slot {
  const props = rng.pick(ALLEY_PROPS);
  const propsWidth = props.reduce((sum, kind) => sum + PROP_WIDTH[kind] + 1, 0);
  return space(Math.max(10, propsWidth + 4 + rng.int(0, 6)), props, true);
}

function middleBuildingSlot(slots: Slot[]): number {
  const indices = slots.flatMap((slot, i) => (slot.type === 'building' ? [i] : []));
  return indices[Math.floor(indices.length / 2)] ?? slots.length - 1;
}

function chunk<T>(items: T[], maxSize: number): T[][] {
  if (items.length === 0) return [];
  const count = Math.ceil(items.length / maxSize);
  const size = Math.ceil(items.length / count);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
