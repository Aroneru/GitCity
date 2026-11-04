import { describe, expect, it } from 'vitest';
import {
  RULES,
  floorsForCommits,
  isAbandoned,
  kindForFloors,
  litRatioForAge,
  rooftopForStars,
  toBuildingSpec,
  widthTierForSize,
} from './rules';
import { NOW, daysAgo, makeRepo } from './test-helpers';

describe('floorsForCommits', () => {
  it('grows on a log scale', () => {
    expect(floorsForCommits(0)).toBe(1);
    expect(floorsForCommits(1)).toBe(2);
    expect(floorsForCommits(10)).toBe(5);
    expect(floorsForCommits(100)).toBe(9);
    expect(floorsForCommits(1000)).toBe(13);
  });

  it('never shrinks as commits grow', () => {
    let previous = 0;
    for (let commits = 0; commits <= 2_000_000; commits = Math.ceil(commits * 1.3) + 1) {
      const floors = floorsForCommits(commits);
      expect(floors).toBeGreaterThanOrEqual(previous);
      previous = floors;
    }
  });

  it('caps huge repos so they cannot dominate the skyline', () => {
    expect(floorsForCommits(1_000_000_000)).toBe(RULES.maxFloors);
  });

  it('treats invalid counts as an empty repo', () => {
    expect(floorsForCommits(-5)).toBe(1);
    expect(floorsForCommits(Number.NaN)).toBe(1);
  });
});

describe('kindForFloors', () => {
  it('picks low-rise shops, then mid-rises, then towers', () => {
    expect(kindForFloors(1)).toBe('shop');
    expect(kindForFloors(4)).toBe('shop');
    expect(kindForFloors(5)).toBe('midrise');
    expect(kindForFloors(10)).toBe('midrise');
    expect(kindForFloors(11)).toBe('tower');
  });
});

describe('widthTierForSize', () => {
  it('splits repo size into three tiers', () => {
    expect(widthTierForSize(0)).toBe('S');
    expect(widthTierForSize(511)).toBe('S');
    expect(widthTierForSize(512)).toBe('M');
    expect(widthTierForSize(5119)).toBe('M');
    expect(widthTierForSize(5120)).toBe('L');
  });
});

describe('rooftopForStars', () => {
  it('adds an antenna, then a billboard, then a beacon', () => {
    expect(rooftopForStars(9)).toBe('none');
    expect(rooftopForStars(10)).toBe('antenna');
    expect(rooftopForStars(99)).toBe('antenna');
    expect(rooftopForStars(100)).toBe('billboard');
    expect(rooftopForStars(999)).toBe('billboard');
    expect(rooftopForStars(1000)).toBe('beacon');
  });
});

describe('litRatioForAge', () => {
  it('lights most windows for fresh pushes and fades with age', () => {
    expect(litRatioForAge(0)).toBeCloseTo(RULES.litMax);
    expect(litRatioForAge(30)).toBeGreaterThan(litRatioForAge(90));
    expect(litRatioForAge(365)).toBeLessThan(0.15);
    expect(litRatioForAge(5000)).toBeGreaterThanOrEqual(RULES.litMin);
  });

  it('uses the minimum when the push date is unknown', () => {
    expect(litRatioForAge(null)).toBe(RULES.litMin);
  });
});

describe('isAbandoned', () => {
  it('needs more than a year without commits, measured from the snapshot time', () => {
    expect(isAbandoned(makeRepo({ lastCommitAt: daysAgo(365) }), NOW)).toBe(false);
    expect(isAbandoned(makeRepo({ lastCommitAt: daysAgo(366) }), NOW)).toBe(true);
  });

  it('falls back to the last push, then the creation date', () => {
    expect(isAbandoned(makeRepo({ lastCommitAt: null, pushedAt: daysAgo(400) }), NOW)).toBe(true);
    expect(isAbandoned(makeRepo({ lastCommitAt: null, pushedAt: null, createdAt: daysAgo(10) }), NOW)).toBe(false);
  });
});

describe('toBuildingSpec', () => {
  it('maps every rule onto one building', () => {
    const spec = toBuildingSpec(
      makeRepo({ name: 'lantern', commitCount: 5000, diskUsageKb: 9000, stars: 1500, language: 'Rust', pushedAt: daysAgo(2) }),
      NOW,
    );
    expect(spec).toMatchObject({
      repoName: 'lantern',
      kind: 'tower',
      floors: floorsForCommits(5000),
      widthTier: 'L',
      neon: 'orange',
      rooftop: 'beacon',
      abandoned: false,
      archived: false,
    });
    expect(spec.litRatio).toBeGreaterThan(0.8);
  });

  it('turns forks into one- or two-storey izakaya whatever their commit count', () => {
    expect(toBuildingSpec(makeRepo({ isFork: true, commitCount: 40 }), NOW)).toMatchObject({ kind: 'izakaya', floors: 1 });
    expect(toBuildingSpec(makeRepo({ isFork: true, commitCount: 1_300_000 }), NOW)).toMatchObject({ kind: 'izakaya', floors: 2 });
  });

  it('darkens abandoned buildings completely', () => {
    const spec = toBuildingSpec(makeRepo({ pushedAt: daysAgo(800), lastCommitAt: daysAgo(800) }), NOW);
    expect(spec.abandoned).toBe(true);
    expect(spec.litRatio).toBe(0);
  });

  it('keeps archived repos flagged and repos without a language plain', () => {
    expect(toBuildingSpec(makeRepo({ isArchived: true, language: null }), NOW)).toMatchObject({ archived: true, neon: 'plain' });
  });
});
