import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** A red paper lantern, 16×16 pixels drawn at 2×. */
const LANTERN = [
  '................',
  '.......kk.......',
  '.....kkkkkk.....',
  '....rrrrrrrr....',
  '...rrRRrrrrrr...',
  '..rrdRRrrrrdrr..',
  '..rrrRRrrrrrrr..',
  '..rdRRRrrrrrdr..',
  '..rrrRRrrrrrrr..',
  '..rrdRRrrrrdrr..',
  '...rrRRrrrrrr...',
  '....rrrrrrrr....',
  '.....kkkkkk.....',
  '.......yy.......',
  '.......yy.......',
  '................',
];

const COLORS: Record<string, string> = {
  k: '#1a1414',
  r: '#e2382e',
  R: '#ff7a52',
  d: '#9e1f1f',
  y: '#ffbe45',
};

export default function Icon() {
  const pixels = LANTERN.flatMap((row, y) =>
    [...row].flatMap((key, x) => (COLORS[key] ? [{ x, y, color: COLORS[key] }] : [])),
  );
  return new ImageResponse(
    (
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', background: '#05071a' }}>
        {pixels.map(({ x, y, color }) => (
          <div key={`${x}-${y}`} style={{ position: 'absolute', left: x * 2, top: y * 2, width: 2, height: 2, background: color }} />
        ))}
      </div>
    ),
    size,
  );
}
