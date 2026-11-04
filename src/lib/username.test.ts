import { describe, expect, it } from 'vitest';
import { cleanUsername, isValidUsername } from './username';

describe('isValidUsername', () => {
  it('accepts GitHub-style logins', () => {
    for (const login of ['octocat', 'a', 'Torvalds', 'yyx990803', 'some-user', 'x'.repeat(39)]) {
      expect(isValidUsername(login)).toBe(true);
    }
  });

  it('rejects anything GitHub would not allow', () => {
    for (const login of ['', '-leading', 'with space', 'x'.repeat(40), 'under_score', '../etc', 'emoji😀']) {
      expect(isValidUsername(login)).toBe(false);
    }
  });
});

describe('cleanUsername', () => {
  it('strips spaces, a leading @ and pasted profile URLs', () => {
    expect(cleanUsername('  @octocat ')).toBe('octocat');
    expect(cleanUsername('https://github.com/torvalds')).toBe('torvalds');
    expect(cleanUsername('https://www.github.com/torvalds/linux')).toBe('torvalds');
  });
});
