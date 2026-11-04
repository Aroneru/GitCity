/** Tiny 7×7 pixel-art icons, drawn as SVG squares. */
const ICONS = {
  plus: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  minus: ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
  fit: ['##...##', '#.....#', '.......', '.......', '.......', '#.....#', '##...##'],
  link: ['.##....', '#..#...', '#.##...', '.##.##.', '...##.#', '...#..#', '....##.'],
  download: ['...#...', '...#...', '...#...', '.#####.', '..###..', '...#...', '#######'],
  close: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  umbrella: ['..###..', '.#####.', '#######', '...#...', '...#...', '.#.#...', '..#....'],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 7 7" width={size} height={size} aria-hidden="true" shapeRendering="crispEdges" fill="currentColor">
      {ICONS[name].flatMap((row, y) =>
        [...row].map((cell, x) => (cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)),
      )}
    </svg>
  );
}
