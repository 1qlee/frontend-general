type Identifier = string | number;

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: Identifier[];
}

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parse(version: string): SemVer {
  const match = SEMVER.exec(version.trim());
  if (!match) throw new TypeError(`Invalid version: "${version}"`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    // Numeric identifiers compare numerically, so convert them once here.
    prerelease: match[4] ? match[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [],
  };
}

const sign = (n: number): -1 | 0 | 1 => (n < 0 ? -1 : n > 0 ? 1 : 0);

function compareIdentifiers(a: Identifier, b: Identifier): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1; // numeric identifiers sort before alphanumeric ones
  if (typeof b === 'number') return 1;
  return a < b ? -1 : a > b ? 1 : 0; // ASCII order
}

function compare(a: SemVer, b: SemVer): -1 | 0 | 1 {
  const core = a.major - b.major || a.minor - b.minor || a.patch - b.patch;
  if (core !== 0) return sign(core);

  // A release has HIGHER precedence than any of its prereleases: 1.0.0-rc.1 < 1.0.0.
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return sign(b.prerelease.length - a.prerelease.length);
  }
  const length = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    const result = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (result !== 0) return sign(result);
  }
  // All shared identifiers equal: the longer set wins (1.0.0-alpha < 1.0.0-alpha.1).
  return sign(a.prerelease.length - b.prerelease.length);
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  return compare(parse(a), parse(b));
}

export function satisfies(version: string, range: string): boolean {
  const match = /^(\^|~|>=|=)?\s*(\S+)$/.exec(range.trim());
  if (!match) throw new TypeError(`Unsupported range: "${range}"`);
  const operator = match[1] ?? '=';
  const v = parse(version);
  const base = parse(match[2]); // throws for '<2.0.0', '1.x', '*', …

  // npm's prerelease rule: 1.3.0-beta.1 does not satisfy ^1.2.0, but 1.2.0-beta.2 satisfies ^1.2.0-beta.1.
  if (v.prerelease.length > 0) {
    const sameTuple = v.major === base.major && v.minor === base.minor && v.patch === base.patch;
    if (!sameTuple || base.prerelease.length === 0) return false;
  }

  const cmp = compare(v, base);
  if (operator === '=') return cmp === 0;
  if (cmp < 0) return false;
  if (operator === '>=') return true;

  const upper: SemVer =
    operator === '~'
      ? { major: base.major, minor: base.minor + 1, patch: 0, prerelease: [] }
      : base.major > 0
        ? { major: base.major + 1, minor: 0, patch: 0, prerelease: [] }
        : base.minor > 0
          ? { major: 0, minor: base.minor + 1, patch: 0, prerelease: [] }
          : { major: 0, minor: 0, patch: base.patch + 1, prerelease: [] };
  return compare(v, upper) < 0;
}
