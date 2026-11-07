/**
 * A small, dependency-free value printer used for console output and
 * assertion messages. It mimics what you would see in browser devtools or
 * Vitest output closely enough to be useful when debugging an exercise.
 */

const MAX_DEPTH = 4;
const MAX_ITEMS = 50;
const MAX_STRING = 2000;

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

function ctorName(value: object): string {
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return '[Object: null prototype]';
  const name = proto?.constructor?.name;
  return typeof name === 'string' ? name : 'Object';
}

function formatKey(key: string | symbol): string {
  if (typeof key === 'symbol') return `[${key.toString()}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function truncate(text: string): string {
  return text.length > MAX_STRING ? `${text.slice(0, MAX_STRING)}… (${text.length - MAX_STRING} more chars)` : text;
}

/** Format any value. `top` controls whether strings are printed raw (console) or quoted (nested). */
export function formatValue(value: unknown, opts: { quoteStrings?: boolean } = {}): string {
  const seen = new WeakSet<object>();

  const fmt = (v: unknown, depth: number, quote: boolean): string => {
    switch (typeof v) {
      case 'string':
        return quote ? JSON.stringify(truncate(v)) : truncate(v);
      case 'number':
        return Object.is(v, -0) ? '-0' : String(v);
      case 'bigint':
        return `${v}n`;
      case 'boolean':
      case 'undefined':
        return String(v);
      case 'symbol':
        return v.toString();
      case 'function': {
        const fn = v as { name?: string; _isMockFunction?: boolean };
        if (fn._isMockFunction) return `[MockFunction${fn.name && fn.name !== 'mockFn' ? ` ${fn.name}` : ''}]`;
        const src = Function.prototype.toString.call(v);
        if (src.startsWith('class ')) return `[class ${fn.name || '(anonymous)'}]`;
        return `[Function${fn.name ? `: ${fn.name}` : ' (anonymous)'}]`;
      }
    }
    if (v === null) return 'null';
    const obj = v as object;
    if (seen.has(obj)) return '[Circular]';

    if (isElement(obj)) {
      const html = obj.outerHTML;
      return html.length > 300 ? `${html.slice(0, 300)}…` : html;
    }
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
    if (obj instanceof RegExp) return obj.toString();
    if (obj instanceof Error) {
      const name = obj.name || 'Error';
      return `${name}: ${obj.message}`;
    }
    if (typeof Promise !== 'undefined' && obj instanceof Promise) return 'Promise { <pending> }';
    if (obj instanceof WeakMap) return 'WeakMap { <items unknown> }';
    if (obj instanceof WeakSet) return 'WeakSet { <items unknown> }';

    if (depth > MAX_DEPTH) {
      if (Array.isArray(obj)) return '[Array]';
      return `[${ctorName(obj)}]`;
    }

    seen.add(obj);
    try {
      if (Array.isArray(obj)) {
        const items = obj.slice(0, MAX_ITEMS).map((item) => fmt(item, depth + 1, true));
        if (obj.length > MAX_ITEMS) items.push(`… ${obj.length - MAX_ITEMS} more items`);
        // Show holes the way devtools does.
        for (let i = 0; i < Math.min(obj.length, MAX_ITEMS); i++) if (!(i in obj)) items[i] = '<empty>';
        return `[${items.join(', ')}]`;
      }
      if (obj instanceof Map) {
        const entries = [...obj.entries()].slice(0, MAX_ITEMS).map(([k, val]) => `${fmt(k, depth + 1, true)} => ${fmt(val, depth + 1, true)}`);
        return `Map(${obj.size}) {${entries.length ? ` ${entries.join(', ')} ` : ''}}`;
      }
      if (obj instanceof Set) {
        const entries = [...obj.values()].slice(0, MAX_ITEMS).map((val) => fmt(val, depth + 1, true));
        return `Set(${obj.size}) {${entries.length ? ` ${entries.join(', ')} ` : ''}}`;
      }
      if (ArrayBuffer.isView(obj) && !(obj instanceof DataView)) {
        const arr = Array.from(obj as unknown as ArrayLike<number>).slice(0, MAX_ITEMS);
        return `${ctorName(obj)}(${(obj as unknown as ArrayLike<number>).length}) [${arr.join(', ')}]`;
      }
      const keys: (string | symbol)[] = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj).filter((s) => Object.prototype.propertyIsEnumerable.call(obj, s))];
      const name = ctorName(obj);
      const prefix = name === 'Object' ? '' : `${name} `;
      if (keys.length === 0) return `${prefix}{}`;
      const parts = keys.slice(0, MAX_ITEMS).map((key) => {
        let val: unknown;
        try {
          val = (obj as Record<string | symbol, unknown>)[key];
        } catch (err) {
          val = `[Getter threw: ${(err as Error)?.message}]`;
        }
        return `${formatKey(key)}: ${fmt(val, depth + 1, true)}`;
      });
      if (keys.length > MAX_ITEMS) parts.push(`… ${keys.length - MAX_ITEMS} more keys`);
      return `${prefix}{ ${parts.join(', ')} }`;
    } finally {
      seen.delete(obj);
    }
  };

  return fmt(value, 0, opts.quoteStrings ?? true);
}

/** Format console.log arguments: top-level strings are printed raw, like browsers do. */
export function formatLogArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  // Minimal printf-style support for %s %d %i %f %o %O %j %c.
  if (typeof args[0] === 'string' && /%[sdifoOjc]/.test(args[0])) {
    let rest = args.slice(1);
    const first = (args[0] as string).replace(/%([sdifoOjc%])/g, (match, flag: string) => {
      if (flag === '%') return '%';
      if (rest.length === 0) return match;
      const [next, ...others] = rest;
      rest = others;
      switch (flag) {
        case 's':
          return typeof next === 'string' ? next : formatValue(next);
        case 'd':
        case 'i':
          return String(flag === 'i' ? Math.trunc(Number(next)) : Number(next));
        case 'f':
          return String(Number(next));
        case 'c':
          return '';
        default:
          return formatValue(next);
      }
    });
    return [first, ...rest.map((a) => formatValue(a, { quoteStrings: false }))].join(' ');
  }
  return args.map((a) => formatValue(a, { quoteStrings: false })).join(' ');
}
