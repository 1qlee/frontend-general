/** [ids, classes/attributes/pseudo-classes, types/pseudo-elements] */
export type Specificity = [number, number, number];

/**
 * Compare two specificities column by column (no "carrying" between columns).
 * Returns a negative number if `a` is lower, 0 if equal, positive if `a` is higher.
 */
export function compareSpecificity(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Pseudo-elements that CSS2 allowed with a single colon. */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);
/** Functional pseudo-classes whose specificity is that of their most specific argument. */
const MAX_OF_ARGUMENTS = new Set(['is', 'not', 'has', 'matches']);

function isIdentChar(ch: string): boolean {
  return /[a-zA-Z0-9_-]/.test(ch) || ch.charCodeAt(0) > 127;
}

/** Index just past an identifier starting at `i` (handles `\` escapes). */
function skipIdent(s: string, i: number): number {
  while (i < s.length) {
    if (s[i] === '\\') i += 2;
    else if (isIdentChar(s[i])) i++;
    else break;
  }
  return i;
}

/** Index of the bracket that closes the one at `open`, skipping quoted strings and nesting. */
function findClose(s: string, open: number): number {
  const openCh = s[open];
  const closeCh = openCh === '(' ? ')' : ']';
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === openCh) {
      depth++;
    } else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return s.length - 1; // unbalanced: treat the rest as the argument
}

/** Split a selector list on top-level commas: 'a, :is(b, c)' → ['a', ':is(b, c)']. */
function splitSelectorList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function maxSpecificity(list: string): Specificity {
  let best: Specificity = [0, 0, 0];
  for (const part of splitSelectorList(list)) {
    const s = specificity(part);
    if (compareSpecificity(s, best) > 0) best = s;
  }
  return best;
}

export function specificity(selector: string): Specificity {
  const s = selector.trim();
  const result: Specificity = [0, 0, 0];
  const add = (other: Specificity) => {
    result[0] += other[0];
    result[1] += other[1];
    result[2] += other[2];
  };

  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (ch === '#') {
      result[0]++;
      i = skipIdent(s, i + 1);
    } else if (ch === '.') {
      result[1]++;
      i = skipIdent(s, i + 1);
    } else if (ch === '[') {
      // attribute selector: skip to the matching ']' so '.', '#' or ':' in the value don't count
      result[1]++;
      i = findClose(s, i) + 1;
    } else if (ch === ':' && s[i + 1] === ':') {
      // ::pseudo-element (possibly functional, e.g. ::part(x))
      result[2]++;
      i = skipIdent(s, i + 2);
      if (s[i] === '(') i = findClose(s, i) + 1;
    } else if (ch === ':') {
      const nameEnd = skipIdent(s, i + 1);
      const name = s.slice(i + 1, nameEnd).toLowerCase();
      i = nameEnd;
      if (s[i] === '(') {
        const close = findClose(s, i);
        const args = s.slice(i + 1, close);
        i = close + 1;
        if (name === 'where') {
          // always zero
        } else if (MAX_OF_ARGUMENTS.has(name)) {
          add(maxSpecificity(args));
        } else if ((name === 'nth-child' || name === 'nth-last-child') && /\sof\s/i.test(args)) {
          // :nth-child(An+B of S) = one pseudo-class + the most specific selector in S
          result[1]++;
          add(maxSpecificity(args.slice(args.search(/\sof\s/i) + 4)));
        } else {
          result[1]++; // :nth-child(2n+1), :lang(en), :dir(rtl)…
        }
      } else if (LEGACY_PSEUDO_ELEMENTS.has(name)) {
        result[2]++;
      } else {
        result[1]++;
      }
    } else if (ch === '*') {
      i++;
    } else if (isIdentChar(ch) || ch === '\\') {
      result[2]++; // type selector
      i = skipIdent(s, i);
    } else {
      i++; // whitespace and combinators: > + ~
    }
  }
  return result;
}
