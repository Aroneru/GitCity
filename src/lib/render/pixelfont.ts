/**
 * A hand-made 3×5 pixel font for tiny Latin text (repo names on rooftop
 * billboards). Lowercase is drawn as uppercase.
 */

const GLYPHS: Record<string, readonly [string, string, string, string, string]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '#.#', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '-': ['...', '...', '###', '...', '...'],
  _: ['...', '...', '...', '...', '###'],
  '.': ['...', '...', '...', '...', '.#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  ' ': ['...', '...', '...', '...', '...'],
};

export const TINY_GLYPH_WIDTH = 3;
export const TINY_GLYPH_HEIGHT = 5;
const ADVANCE = TINY_GLYPH_WIDTH + 1;

export function tinyTextWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * ADVANCE - 1;
}

/** Trim text to fit `maxWidth` pixels. */
export function fitTinyText(text: string, maxWidth: number): string {
  const maxChars = Math.max(0, Math.floor((maxWidth + 1) / ADVANCE));
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

export function drawTinyText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  [...text].forEach((char, i) => {
    const rows = GLYPHS[char.toUpperCase()] ?? GLYPHS['-'];
    rows.forEach((row, j) => {
      for (let k = 0; k < TINY_GLYPH_WIDTH; k++) {
        if (row[k] === '#') ctx.fillRect(x + i * ADVANCE + k, y + j, 1, 1);
      }
    });
  });
}
