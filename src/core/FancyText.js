// FancyText.js — 𝓥𝓸𝓲𝓬𝓮𝓞𝓿𝓮𝓻 style headings (Mathematical Bold Script)
// Headings only — body text stays readable. Plain ASCII passes through untouched.

const UPPER_BASE = 0x1D4D0; // 𝓐
const LOWER_BASE = 0x1D4EA; // 𝓪
// Some code points in the block are reserved; map exceptions:
const UPPER_FIX = { C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211B, Z: 0x2128 };
const LOWER_FIX = { e: 0x212F, g: 0x210A, o: 0x2134 };

export function toScript(str) {
  return String(str).replace(/[A-Za-z]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      if (UPPER_FIX[ch]) return String.fromCodePoint(UPPER_FIX[ch]);
      return String.fromCodePoint(UPPER_BASE + (code - 65));
    }
    if (UPPER_FIX[ch]) return String.fromCodePoint(UPPER_FIX[ch]);
    const lower = ch.toLowerCase();
    if (LOWER_FIX[lower] && ch !== ch.toUpperCase()) return String.fromCodePoint(LOWER_FIX[lower]);
    if (code >= 97 && code <= 122) return String.fromCodePoint(LOWER_BASE + (code - 97));
    return ch;
  });
}
