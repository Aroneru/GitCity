import { describe, expect, it } from 'vitest';
import { chooseExportScale } from './panorama';

describe('chooseExportScale', () => {
  it('exports small cities at the preferred scale', () => {
    expect(chooseExportScale(2000, 330)).toBe(4);
  });

  it('stays under browser canvas limits for long streets', () => {
    const scale = chooseExportScale(5500, 400);
    expect(scale).toBe(2);
    expect(5500 * scale).toBeLessThanOrEqual(16_384);
    expect(5500 * scale * 400 * scale).toBeLessThanOrEqual(16_777_216);
  });

  it('never drops below 1×', () => {
    expect(chooseExportScale(20_000, 400)).toBe(1);
  });
});
