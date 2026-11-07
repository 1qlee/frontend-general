/**
 * Compares two semantic versions (MAJOR.MINOR.PATCH[-prerelease][+build]).
 * Returns -1 if a < b, 0 if they have the same precedence, 1 if a > b.
 * Throws a TypeError for an invalid version.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  throw new Error('Not implemented');
}

/**
 * Does `version` satisfy `range`? Supported ranges:
 *   '1.2.3' or '=1.2.3'   exact
 *   '>=1.2.3'             greater than or equal
 *   '~1.2.3'              >=1.2.3 <1.3.0          (patch updates)
 *   '^1.2.3'              >=1.2.3 <2.0.0          (minor + patch updates)
 *   '^0.2.3'              >=0.2.3 <0.3.0          (0.x: the minor is "major")
 *   '^0.0.3'              >=0.0.3 <0.0.4
 * A prerelease version only satisfies a range whose own version is a prerelease
 * of the same MAJOR.MINOR.PATCH (npm's rule). Throws a TypeError for anything else.
 */
export function satisfies(version: string, range: string): boolean {
  throw new Error('Not implemented');
}
