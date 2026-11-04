import type { BuildingKind } from './rules';
import type { Rng } from './seed';

/**
 * Sign vocabulary: real, everyday Japanese shop words only, grouped by the
 * kind of building that would plausibly carry them. Every character here is
 * covered by DotGothic16 (checked against the font's cmap).
 */
export const SIGN_WORDS: Readonly<Record<BuildingKind, readonly string[]>> = {
  // Small street-level shops (horizontal signs).
  shop: [
    '薬', '本', '酒', '湯', '茶', '花', '米', '質',
    '喫茶', '本屋', '薬局', '古書', '花屋', '写真', '中華', '定食', '餃子', '文具', '酒店',
    '時計', '眼鏡', '電器', '豆腐', 'パン', '床屋', '精肉', '鮮魚', '青果', '理容', '珈琲',
    '画廊', '骨董', '銭湯', '玩具',
    '和菓子', '洋菓子', '不動産', '美容室', '古本屋', '喫茶店', '定食屋', '八百屋', '金物屋',
    '文房具', '写真館', '時計店',
  ],
  // Forks: izakaya and food counters.
  izakaya: [
    '酒', '鮨',
    '焼鳥', '酒場', '炉端', '寿司', 'そば', '蕎麦',
    '居酒屋', 'おでん', 'うどん', '串カツ', '小料理', '天ぷら', 'もつ焼', '立飲み',
    '大衆酒場', 'ラーメン',
  ],
  // Mixed-tenant mid-rises (vertical signs).
  midrise: [
    '麻雀', '雀荘', '歯科', '眼科', 'バー', '焼肉', '中華', '占い', '質屋', '書店', '囲碁',
    '将棋', '喫茶',
    '英会話', '整骨院', '学習塾', '居酒屋', '美容室', 'ネイル', 'ダーツ', 'ホテル', '鍼灸院',
    'カラオケ', 'スナック', '漫画喫茶', 'ラーメン',
  ],
  // Towers (vertical signs).
  tower: [
    '焼肉', '家電', '書店',
    'ホテル', 'ゲーム', 'シネマ', 'サウナ', '映画館', '百貨店',
    'カラオケ', '漫画喫茶', 'ラーメン',
  ],
};

/** Shown on the board of an archived shop or izakaya. */
export const CLOSED_SIGN = '閉店';
/** Shown on the board of the empty lot. */
export const LOT_SIGN = '売地';
/** Gate sign over a cluster of izakaya. */
export const YOKOCHO_SIGN = '横丁';

export function charCount(word: string): number {
  return [...word].length;
}

/** Pick a word for a building whose sign holds between `minChars` and `maxChars` glyphs. */
export function pickSignWord(kind: BuildingKind, minChars: number, maxChars: number, rng: Rng): string {
  const words = SIGN_WORDS[kind];
  const fitting = words.filter((word) => {
    const n = charCount(word);
    return n >= minChars && n <= maxChars;
  });
  if (fitting.length > 0) return rng.pick(fitting);
  // Fall back to the shortest words when nothing fits the range exactly.
  const shortest = Math.min(...words.map(charCount));
  return rng.pick(words.filter((word) => charCount(word) === shortest));
}

/** Every character a city can put on a sign, for preloading glyphs. */
export function allSignCharacters(): string {
  const all = [...Object.values(SIGN_WORDS).flat(), CLOSED_SIGN, LOT_SIGN, YOKOCHO_SIGN].join('');
  return [...new Set(all)].join('');
}
