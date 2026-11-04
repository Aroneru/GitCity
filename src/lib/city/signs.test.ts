import { describe, expect, it } from 'vitest';
import { createRng } from './seed';
import { SIGN_WORDS, allSignCharacters, charCount, pickSignWord } from './signs';

/**
 * Every sign character, checked present in DotGothic16's character map.
 * Adding a word with a new character fails this test until the new
 * character has been checked against the font too.
 */
const FONT_VERIFIED =
  'いうおそつでどばぷみもらんイウオカクケゲサシスダッツテナネバパホマムメラルンー丁不中串会八具写動占古司和喫器囲地場塾売大天子学定室家容寿将小局居屋床店廊房整文料映時書本果棋横歯洋湯漫灸炉焼物玩珈理琲産画百真眼碁科立端米精美習肉腐花英茶荘菓華董蕎薬衆計話豆貨質酒金銭鍼鏡閉院雀電青食飲餃館骨魚鮨鮮鳥麦麻';

describe('sign vocabulary', () => {
  it('uses only Japanese characters the sign font is known to have', () => {
    const verified = new Set(FONT_VERIFIED);
    const unverified = [...allSignCharacters()].filter((char) => !verified.has(char));
    expect(unverified).toEqual([]);
  });

  it('is made of kana and kanji only, with no Latin letters or digits', () => {
    for (const word of Object.values(SIGN_WORDS).flat()) {
      expect(word).toMatch(/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u);
    }
  });

  it('has a word of every length the layout asks for', () => {
    const lengths = (kind: keyof typeof SIGN_WORDS) => new Set(SIGN_WORDS[kind].map(charCount));
    expect([...lengths('shop')]).toEqual(expect.arrayContaining([1, 2, 3]));
    expect([...lengths('izakaya')]).toEqual(expect.arrayContaining([1, 2, 3]));
    expect([...lengths('midrise')]).toEqual(expect.arrayContaining([2, 3, 4]));
    expect([...lengths('tower')]).toEqual(expect.arrayContaining([3, 4]));
  });
});

describe('pickSignWord', () => {
  it('respects the character limits', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const n = charCount(pickSignWord('midrise', 2, 3, rng));
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('is deterministic for a seed', () => {
    expect(pickSignWord('shop', 1, 3, createRng(11))).toBe(pickSignWord('shop', 1, 3, createRng(11)));
  });

  it('falls back to the shortest words when nothing fits', () => {
    expect(charCount(pickSignWord('tower', 9, 9, createRng(1)))).toBe(2);
  });
});
