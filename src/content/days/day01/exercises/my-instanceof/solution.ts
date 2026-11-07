export function myInstanceOf(value: unknown, Ctor: unknown): boolean {
  if (typeof Ctor !== 'function') throw new TypeError("Right-hand side of 'instanceof' is not callable");
  // Primitives (and null) have no prototype chain to walk.
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return false;

  const target = (Ctor as { prototype: unknown }).prototype;
  let proto = Object.getPrototypeOf(value);
  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
