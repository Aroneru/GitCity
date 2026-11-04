import { describe, expect, it } from 'vitest';
import { NEON_HUES, neonForLanguage } from './languages';

describe('neonForLanguage', () => {
  it('gives common languages a fixed hue', () => {
    expect(neonForLanguage('TypeScript')).toBe('cyan');
    expect(neonForLanguage('JavaScript')).toBe('amber');
    expect(neonForLanguage('Ruby')).toBe('pink');
    expect(neonForLanguage('HTML')).toBe('red');
  });

  it('ignores case and surrounding whitespace', () => {
    expect(neonForLanguage('  typescript ')).toBe(neonForLanguage('TypeScript'));
  });

  it('uses a plain lightbox when there is no language', () => {
    expect(neonForLanguage(null)).toBe('plain');
    expect(neonForLanguage('   ')).toBe('plain');
  });

  it('hashes unknown languages to the same palette hue every time', () => {
    const hue = neonForLanguage('Brainfuck');
    expect(NEON_HUES).toContain(hue);
    expect(neonForLanguage('brainfuck')).toBe(hue);
  });
});
