/**
 * GitHub logins are letters, digits and hyphens, start with a letter or
 * digit, and are at most 39 characters. (Hyphen placement is kept loose:
 * some older accounts have doubled or trailing hyphens.)
 */
const LOGIN = /^[a-z\d][a-z\d-]{0,38}$/i;

export function isValidUsername(value: string): boolean {
  return LOGIN.test(value);
}

/** Tidy what people type: surrounding spaces, a leading @, or a pasted profile URL. */
export function cleanUsername(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '');
}
