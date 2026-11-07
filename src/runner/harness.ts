/**
 * A tiny, Vitest-compatible test runtime.
 *
 * Exercise tests are written as ordinary Vitest files:
 *
 *   import { describe, it, expect, vi } from 'vitest';
 *   import { debounce } from './solution';
 *
 * This module evaluates already-transpiled CommonJS modules, provides the
 * `vitest` API (describe/it/expect/vi/hooks), controllable fake timers, mock
 * functions and a jest-dom-style matcher subset. It has no DOM or Node
 * dependencies, so the same code runs inside a Web Worker, inside the sandbox
 * iframe (with React + Testing Library) and inside Node for content validation.
 */
import { formatLogArgs, formatValue } from './format';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export interface LogEntry {
  level: LogLevel;
  text: string;
}
export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  error?: string;
  durationMs: number;
}
export interface RunSummary {
  results: TestResult[];
  /** Fatal error that prevented tests from being collected or run. */
  error?: string;
  durationMs: number;
}
/** path (e.g. "solution") → CommonJS source produced by the TypeScript transpiler. */
export type ModuleMap = Record<string, string>;

export interface RuntimeOptions {
  /** Packages available to `require()` (e.g. react, @testing-library/react). `vitest` is always provided. */
  builtins?: Record<string, unknown>;
  onLog?: (entry: LogEntry) => void;
  /** Called after every test (e.g. Testing Library's `cleanup`). */
  afterEachTest?: () => void | Promise<void>;
  /** Default per-test timeout in ms. */
  testTimeout?: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

function errorToString(err: unknown): string {
  if (err instanceof AssertionError) return err.message;
  if (err instanceof Error) {
    const name = err.name || 'Error';
    return `${name}: ${err.message}`;
  }
  return `Thrown: ${formatValue(err)}`;
}

// ---------------------------------------------------------------------------
// Asymmetric matchers + deep equality
// ---------------------------------------------------------------------------

const ASYMMETRIC = Symbol.for('feg.asymmetricMatcher');
interface AsymmetricMatcher {
  [ASYMMETRIC]: true;
  matches(other: unknown): boolean;
  toString(): string;
}
function isAsymmetric(value: unknown): value is AsymmetricMatcher {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[ASYMMETRIC] === true;
}
function asymmetric(description: string, matches: (other: unknown) => boolean): AsymmetricMatcher {
  return { [ASYMMETRIC]: true, matches, toString: () => description };
}

function isPlainObjectLike(value: unknown): value is Record<string | symbol, unknown> {
  return typeof value === 'object' && value !== null;
}

export function deepEqual(a: unknown, b: unknown, strict = false, seen = new Map<object, object>()): boolean {
  if (isAsymmetric(b)) return b.matches(a);
  if (isAsymmetric(a)) return a.matches(b);
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (!isPlainObjectLike(a) || !isPlainObjectLike(b)) return false;

  // Cycle guard
  const prev = seen.get(a);
  if (prev && prev === b) return true;
  seen.set(a, b);

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof RegExp || b instanceof RegExp) {
    return a instanceof RegExp && b instanceof RegExp && a.toString() === b.toString();
  }
  if (a instanceof Error && b instanceof Error) {
    return a.name === b.name && a.message === b.message;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key)) {
        // Fall back to deep key comparison for object keys.
        let found = false;
        for (const [k2, v2] of b) {
          if (deepEqual(key, k2, strict, seen) && deepEqual(val, v2, strict, seen)) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      } else if (!deepEqual(val, b.get(key), strict, seen)) return false;
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    outer: for (const val of a) {
      if (b.has(val)) continue;
      for (const v2 of b) if (deepEqual(val, v2, strict, seen)) continue outer;
      return false;
    }
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (strict && (i in a) !== (i in b)) return false;
      if (!deepEqual(a[i], b[i], strict, seen)) return false;
    }
    return true;
  }
  if (typeof Node !== 'undefined' && a instanceof Node && b instanceof Node) {
    return a.isEqualNode(b);
  }

  const keysA = Reflect.ownKeys(a).filter((k) => Object.prototype.propertyIsEnumerable.call(a, k));
  const keysB = Reflect.ownKeys(b).filter((k) => Object.prototype.propertyIsEnumerable.call(b, k));
  const relevant = (obj: Record<string | symbol, unknown>, keys: (string | symbol)[]) =>
    strict ? keys : keys.filter((k) => obj[k] !== undefined);
  const ka = relevant(a, keysA);
  const kb = relevant(b, keysB);
  if (ka.length !== kb.length) return false;
  for (const key of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, key) && !(strict === false && b[key] === undefined && a[key] === undefined)) return false;
    if (!deepEqual(a[key], b[key], strict, seen)) return false;
  }
  return true;
}

function matchObject(received: unknown, expected: unknown): boolean {
  if (isAsymmetric(expected)) return expected.matches(received);
  if (!isPlainObjectLike(expected) || !isPlainObjectLike(received)) return deepEqual(received, expected);
  if (Array.isArray(expected)) {
    if (!Array.isArray(received) || received.length !== expected.length) return false;
    return expected.every((item, i) => matchObject(received[i], item));
  }
  return Reflect.ownKeys(expected).every((key) => key in received && matchObject(received[key], expected[key]));
}

// ---------------------------------------------------------------------------
// Mock functions
// ---------------------------------------------------------------------------

export interface MockResult {
  type: 'return' | 'throw';
  value: unknown;
}
export interface MockState {
  calls: unknown[][];
  results: MockResult[];
  instances: unknown[];
  lastCall: unknown[] | undefined;
}
type AnyFn = (...args: any[]) => any;
export interface Mock extends AnyFn {
  _isMockFunction: true;
  mock: MockState;
  getMockName(): string;
  mockName(name: string): Mock;
  mockImplementation(fn: AnyFn): Mock;
  mockImplementationOnce(fn: AnyFn): Mock;
  mockReturnValue(value: unknown): Mock;
  mockReturnValueOnce(value: unknown): Mock;
  mockResolvedValue(value: unknown): Mock;
  mockResolvedValueOnce(value: unknown): Mock;
  mockRejectedValue(value: unknown): Mock;
  mockRejectedValueOnce(value: unknown): Mock;
  mockClear(): Mock;
  mockReset(): Mock;
  mockRestore(): Mock;
}

function isMock(value: unknown): value is Mock {
  return typeof value === 'function' && (value as Partial<Mock>)._isMockFunction === true;
}

function createMock(impl?: AnyFn, restore?: () => void): Mock {
  let implementation = impl;
  const onceQueue: AnyFn[] = [];
  let name = 'vi.fn()';
  const state: MockState = { calls: [], results: [], instances: [], lastCall: undefined };

  const mockFn = function (this: unknown, ...args: unknown[]) {
    state.calls.push(args);
    state.lastCall = args;
    state.instances.push(this);
    const current = onceQueue.length ? onceQueue.shift() : implementation;
    try {
      const value = current ? current.apply(this, args) : undefined;
      state.results.push({ type: 'return', value });
      return value;
    } catch (err) {
      state.results.push({ type: 'throw', value: err });
      throw err;
    }
  } as unknown as Mock;

  Object.defineProperty(mockFn, 'name', { value: 'mockFn' });
  // Preserve arity so code that inspects fn.length (curry, etc.) behaves like with the real function.
  Object.defineProperty(mockFn, 'length', { value: impl?.length ?? 0 });
  mockFn._isMockFunction = true;
  mockFn.mock = state;
  mockFn.getMockName = () => name;
  mockFn.mockName = (n) => ((name = n), mockFn);
  mockFn.mockImplementation = (fn) => ((implementation = fn), mockFn);
  mockFn.mockImplementationOnce = (fn) => (onceQueue.push(fn), mockFn);
  mockFn.mockReturnValue = (v) => mockFn.mockImplementation(() => v);
  mockFn.mockReturnValueOnce = (v) => mockFn.mockImplementationOnce(() => v);
  mockFn.mockResolvedValue = (v) => mockFn.mockImplementation(() => Promise.resolve(v));
  mockFn.mockResolvedValueOnce = (v) => mockFn.mockImplementationOnce(() => Promise.resolve(v));
  mockFn.mockRejectedValue = (v) => mockFn.mockImplementation(() => Promise.reject(v));
  mockFn.mockRejectedValueOnce = (v) => mockFn.mockImplementationOnce(() => Promise.reject(v));
  mockFn.mockClear = () => {
    state.calls.length = 0;
    state.results.length = 0;
    state.instances.length = 0;
    state.lastCall = undefined;
    return mockFn;
  };
  mockFn.mockReset = () => {
    mockFn.mockClear();
    implementation = undefined;
    onceQueue.length = 0;
    return mockFn;
  };
  mockFn.mockRestore = () => {
    mockFn.mockReset();
    restore?.();
    return mockFn;
  };
  return mockFn;
}

// ---------------------------------------------------------------------------
// Timers (real + fake). User code receives these as injected globals, so fake
// timers never touch the host environment's real timers.
// ---------------------------------------------------------------------------

interface FakeTimer {
  id: number;
  time: number;
  callback: AnyFn;
  args: unknown[];
  interval?: number;
}

class TimerController {
  private readonly realSetTimeout = globalThis.setTimeout.bind(globalThis);
  private readonly realClearTimeout = globalThis.clearTimeout.bind(globalThis);
  private readonly realSetInterval = globalThis.setInterval.bind(globalThis);
  private readonly realClearInterval = globalThis.clearInterval.bind(globalThis);
  private readonly realDateNow = Date.now.bind(Date);
  private readonly realPerfNow =
    typeof performance !== 'undefined' ? performance.now.bind(performance) : () => this.realDateNow();

  fake = false;
  private now = 0;
  private perfOffset = 0;
  private queue: FakeTimer[] = [];
  private nextId = 1;
  /** Real timers created by user code that have not fired or been cleared yet. */
  readonly pendingReal = new Set<unknown>();
  private readonly realIntervals = new Set<unknown>();
  private readonly fakeIds = new Set<number>();

  currentTime = (): number => (this.fake ? this.now : this.realDateNow());
  currentPerf = (): number => (this.fake ? this.now - this.perfOffset : this.realPerfNow());

  useFakeTimers(): void {
    if (this.fake) return;
    this.fake = true;
    this.now = this.realDateNow();
    this.perfOffset = this.now - this.realPerfNow();
    this.queue = [];
  }
  useRealTimers(): void {
    this.fake = false;
    this.queue = [];
    this.fakeIds.clear();
  }
  setSystemTime(time: number | Date): void {
    const t = typeof time === 'number' ? time : time.getTime();
    if (this.fake) {
      const delta = t - this.now;
      this.now = t;
      this.perfOffset += delta;
    }
  }
  getTimerCount(): number {
    return this.queue.length;
  }

  /** Wait for a real macrotask so pending microtasks (promise callbacks) flush. */
  realTick = (): Promise<void> => new Promise((resolve) => this.realSetTimeout(resolve, 0));
  realDelay = (ms: number): Promise<void> => new Promise((resolve) => this.realSetTimeout(resolve, ms));
  scheduleReal = (fn: () => void, ms: number): unknown => this.realSetTimeout(fn, ms);
  cancelReal = (handle: unknown): void => this.realClearTimeout(handle as ReturnType<typeof setTimeout>);

  // Injected API -------------------------------------------------------------
  setTimeout = (callback: AnyFn, ms = 0, ...args: unknown[]): unknown => {
    if (typeof callback !== 'function') throw new TypeError('setTimeout: callback must be a function');
    const delay = Math.max(0, Number(ms) || 0);
    if (this.fake) return this.addFake(callback, delay, args);
    const handle: unknown = this.realSetTimeout(() => {
      this.pendingReal.delete(handle);
      callback(...args);
    }, delay);
    this.pendingReal.add(handle);
    return handle;
  };
  clearTimeout = (handle: unknown): void => {
    if (typeof handle === 'number' && this.fakeIds.has(handle)) {
      this.removeFake(handle);
      return;
    }
    if (handle === undefined || handle === null) return;
    this.pendingReal.delete(handle);
    this.realClearTimeout(handle as ReturnType<typeof setTimeout>);
  };
  setInterval = (callback: AnyFn, ms = 0, ...args: unknown[]): unknown => {
    const delay = Math.max(0, Number(ms) || 0);
    if (this.fake) return this.addFake(callback, delay, args, Math.max(1, delay));
    const handle: unknown = this.realSetInterval(() => callback(...args), delay);
    this.pendingReal.add(handle);
    this.realIntervals.add(handle);
    return handle;
  };
  clearInterval = (handle: unknown): void => {
    if (typeof handle === 'number' && this.fakeIds.has(handle)) {
      this.removeFake(handle);
      return;
    }
    if (handle === undefined || handle === null) return;
    this.pendingReal.delete(handle);
    this.realIntervals.delete(handle);
    this.realClearInterval(handle as ReturnType<typeof setInterval>);
  };
  requestAnimationFrame = (callback: (t: number) => void): unknown => {
    if (!this.fake && typeof globalThis.requestAnimationFrame === 'function') {
      return globalThis.requestAnimationFrame(callback);
    }
    return this.setTimeout(() => callback(this.currentPerf()), 16);
  };
  cancelAnimationFrame = (handle: unknown): void => {
    if (typeof handle === 'number' && this.fakeIds.has(handle)) return this.removeFake(handle);
    if (typeof globalThis.cancelAnimationFrame === 'function') globalThis.cancelAnimationFrame(handle as number);
    else this.clearTimeout(handle);
  };

  clearAllReal(): void {
    for (const handle of this.pendingReal) {
      this.realClearTimeout(handle as ReturnType<typeof setTimeout>);
      this.realClearInterval(handle as ReturnType<typeof setInterval>);
    }
    this.pendingReal.clear();
    this.realIntervals.clear();
  }
  /** Pending real timers that are not intervals (intervals never "finish"). */
  pendingRealTimeouts(): number {
    let n = 0;
    for (const h of this.pendingReal) if (!this.realIntervals.has(h)) n++;
    return n;
  }

  private addFake(callback: AnyFn, delay: number, args: unknown[], interval?: number): number {
    const id = this.nextId++;
    this.fakeIds.add(id);
    this.queue.push({ id, time: this.now + delay, callback, args, interval });
    return id;
  }
  private removeFake(id: number): void {
    this.fakeIds.delete(id);
    this.queue = this.queue.filter((t) => t.id !== id);
  }
  private nextDue(limit: number): FakeTimer | undefined {
    let best: FakeTimer | undefined;
    for (const t of this.queue) {
      if (t.time <= limit && (!best || t.time < best.time || (t.time === best.time && t.id < best.id))) best = t;
    }
    return best;
  }
  private fire(timer: FakeTimer): void {
    this.now = Math.max(this.now, timer.time);
    if (timer.interval !== undefined) {
      timer.time += timer.interval;
    } else {
      this.removeFake(timer.id);
    }
    timer.callback(...timer.args);
  }
  private assertFake(method: string): void {
    if (!this.fake) throw new Error(`vi.${method}() requires fake timers. Call vi.useFakeTimers() first.`);
  }

  advanceTimersByTime(ms: number): void {
    this.assertFake('advanceTimersByTime');
    const target = this.now + Math.max(0, ms);
    for (let i = 0; i < 100_000; i++) {
      const next = this.nextDue(target);
      if (!next) break;
      this.fire(next);
    }
    this.now = target;
  }
  async advanceTimersByTimeAsync(ms: number): Promise<void> {
    this.assertFake('advanceTimersByTimeAsync');
    const target = this.now + Math.max(0, ms);
    await this.realTick();
    for (let i = 0; i < 100_000; i++) {
      const next = this.nextDue(target);
      if (!next) break;
      this.fire(next);
      await this.realTick();
    }
    this.now = target;
    await this.realTick();
  }
  runAllTimers(): void {
    this.assertFake('runAllTimers');
    for (let i = 0; i < 10_000; i++) {
      const next = this.nextDue(Infinity);
      if (!next) return;
      this.fire(next);
    }
    throw new Error('Aborting after running 10000 timers — is there an infinite timer loop (e.g. a setInterval)?');
  }
  async runAllTimersAsync(): Promise<void> {
    this.assertFake('runAllTimersAsync');
    await this.realTick();
    for (let i = 0; i < 10_000; i++) {
      const next = this.nextDue(Infinity);
      if (!next) return;
      this.fire(next);
      await this.realTick();
    }
    throw new Error('Aborting after running 10000 timers — is there an infinite timer loop (e.g. a setInterval)?');
  }
  runOnlyPendingTimers(): void {
    this.assertFake('runOnlyPendingTimers');
    const ids = new Set(this.queue.map((t) => t.id));
    const limit = Math.max(this.now, ...this.queue.map((t) => t.time));
    for (let i = 0; i < 10_000; i++) {
      const next = this.queue.filter((t) => ids.has(t.id) && t.time <= limit).sort((a, b) => a.time - b.time || a.id - b.id)[0];
      if (!next) return;
      ids.delete(next.id);
      this.fire(next);
    }
  }
}

function createDateClass(timers: TimerController): DateConstructor {
  const RealDate = Date;
  class MockDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(timers.currentTime());
      else super(...(args as [string]));
    }
    static now(): number {
      return timers.currentTime();
    }
  }
  return MockDate as unknown as DateConstructor;
}

// ---------------------------------------------------------------------------
// The runtime
// ---------------------------------------------------------------------------

type TestFn = () => unknown | Promise<unknown>;
type Hook = TestFn;
interface TestCase {
  name: string;
  fn?: TestFn;
  skip: boolean;
  only: boolean;
  timeout?: number;
  suite: Suite;
}
interface Suite {
  name: string;
  parent?: Suite;
  skip: boolean;
  only: boolean;
  children: (Suite | TestCase)[];
  beforeAll: Hook[];
  afterAll: Hook[];
  beforeEach: Hook[];
  afterEach: Hook[];
}
function isSuite(node: Suite | TestCase): node is Suite {
  return 'children' in node;
}

const INJECTED_GLOBALS = [
  'require',
  'exports',
  'module',
  'console',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Date',
  'performance',
] as const;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor;

function formatTitle(template: string, args: unknown[], index: number): string {
  let i = 0;
  let title = template.replace(/%[sdifjoO#%]/g, (match) => {
    if (match === '%%') return '%';
    if (match === '%#') return String(index);
    const value = args[i++];
    if (match === '%s') return typeof value === 'string' ? value : formatValue(value);
    if (match === '%d' || match === '%i') return String(Math.trunc(Number(value)));
    if (match === '%f') return String(Number(value));
    return formatValue(value);
  });
  // $variable interpolation for object rows: test.each([{ a: 1 }])('$a', ...)
  if (args.length === 1 && isPlainObjectLike(args[0])) {
    const row = args[0] as Record<string, unknown>;
    title = title.replace(/\$([A-Za-z_][\w.]*)/g, (m, key: string) =>
      key in row ? (typeof row[key] === 'string' ? (row[key] as string) : formatValue(row[key])) : m,
    );
  }
  return title;
}

export class TestRuntime {
  readonly timers = new TimerController();
  private readonly builtins: Record<string, unknown>;
  private readonly onLog?: (entry: LogEntry) => void;
  private readonly afterEachTest?: () => void | Promise<void>;
  private readonly testTimeout: number;
  private readonly root: Suite = this.createSuite('', undefined);
  private current: Suite = this.root;
  private modules: ModuleMap = {};
  private readonly cache = new Map<string, { exports: unknown }>();
  private readonly spies = new Set<Mock>();
  private readonly stubbedGlobals = new Map<string, PropertyDescriptor | undefined>();
  private readonly injected: Record<(typeof INJECTED_GLOBALS)[number], unknown>;
  readonly console: Console;

  constructor(options: RuntimeOptions = {}) {
    this.onLog = options.onLog;
    this.afterEachTest = options.afterEachTest;
    this.testTimeout = options.testTimeout ?? 5000;
    this.console = this.createConsole();
    this.builtins = { ...options.builtins, vitest: this.createVitestApi() };
    const timers = this.timers;
    const perf = {
      now: () => timers.currentPerf(),
      mark: (...args: unknown[]) => (globalThis.performance as unknown as { mark: AnyFn })?.mark?.(...args),
      measure: (...args: unknown[]) => (globalThis.performance as unknown as { measure: AnyFn })?.measure?.(...args),
      get timeOrigin() {
        return globalThis.performance?.timeOrigin ?? 0;
      },
    };
    this.injected = {
      require: (id: string) => this.require(id),
      exports: undefined,
      module: undefined,
      console: this.console,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      requestAnimationFrame: timers.requestAnimationFrame,
      cancelAnimationFrame: timers.cancelAnimationFrame,
      Date: createDateClass(timers),
      performance: perf,
    };
  }

  // -- console ---------------------------------------------------------------
  private createConsole(): Console {
    const emit = (level: LogLevel) => (...args: unknown[]) => this.onLog?.({ level, text: formatLogArgs(args) });
    const counts = new Map<string, number>();
    const timersMap = new Map<string, number>();
    const base = {
      log: emit('log'),
      info: emit('info'),
      warn: emit('warn'),
      error: emit('error'),
      debug: emit('debug'),
      trace: emit('debug'),
      dir: (value: unknown) => this.onLog?.({ level: 'log', text: formatValue(value) }),
      table: (value: unknown) => this.onLog?.({ level: 'log', text: formatValue(value) }),
      group: emit('log'),
      groupCollapsed: emit('log'),
      groupEnd: () => {},
      assert: (cond: unknown, ...args: unknown[]) => {
        if (!cond) this.onLog?.({ level: 'error', text: `Assertion failed${args.length ? `: ${formatLogArgs(args)}` : ''}` });
      },
      count: (label = 'default') => {
        const n = (counts.get(label) ?? 0) + 1;
        counts.set(label, n);
        this.onLog?.({ level: 'log', text: `${label}: ${n}` });
      },
      countReset: (label = 'default') => counts.delete(label),
      time: (label = 'default') => timersMap.set(label, this.timers.currentPerf()),
      timeEnd: (label = 'default') => {
        const start = timersMap.get(label);
        if (start !== undefined) this.onLog?.({ level: 'log', text: `${label}: ${(this.timers.currentPerf() - start).toFixed(3)} ms` });
        timersMap.delete(label);
      },
      timeLog: (label = 'default') => {
        const start = timersMap.get(label);
        if (start !== undefined) this.onLog?.({ level: 'log', text: `${label}: ${(this.timers.currentPerf() - start).toFixed(3)} ms` });
      },
    };
    return base as unknown as Console;
  }

  // -- module system ---------------------------------------------------------
  private normalize(id: string): string {
    return id.replace(/^\.\//, '').replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
  }

  require(id: string): unknown {
    if (Object.prototype.hasOwnProperty.call(this.builtins, id)) return this.builtins[id];
    const key = this.normalize(id);
    const cached = this.cache.get(key);
    if (cached) return cached.exports;
    if (!(key in this.modules)) {
      const available = Object.keys(this.builtins).concat(Object.keys(this.modules).map((m) => `./${m}`));
      throw new Error(`Cannot find module '${id}'. Available modules: ${available.join(', ')}`);
    }
    const module = { exports: {} as unknown };
    this.cache.set(key, module);
    const fn = new Function(...INJECTED_GLOBALS, `${this.modules[key]}\n//# sourceURL=${key}.js`);
    fn(...INJECTED_GLOBALS.map((name) => (name === 'exports' ? module.exports : name === 'module' ? module : this.injected[name])));
    return module.exports;
  }

  /** Evaluate a module whose top level may use `await` (used by the playground). */
  async evaluateAsync(key: string, code: string): Promise<unknown> {
    const module = { exports: {} as unknown };
    this.cache.set(key, module);
    const fn = new AsyncFunction(...INJECTED_GLOBALS, `${code}\n//# sourceURL=${key}.js`);
    await fn(...INJECTED_GLOBALS.map((name) => (name === 'exports' ? module.exports : name === 'module' ? module : this.injected[name])));
    return module.exports;
  }

  loadModules(modules: ModuleMap): void {
    this.modules = { ...this.modules, ...Object.fromEntries(Object.entries(modules).map(([k, v]) => [this.normalize(k), v])) };
  }

  // -- test registration -----------------------------------------------------
  private createSuite(name: string, parent: Suite | undefined, skip = false, only = false): Suite {
    return { name, parent, skip, only, children: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] };
  }

  private createVitestApi() {
    const addSuite = (name: string, fn: () => void, flags: { skip?: boolean; only?: boolean } = {}) => {
      const suite = this.createSuite(name, this.current, !!flags.skip, !!flags.only);
      this.current.children.push(suite);
      const prev = this.current;
      this.current = suite;
      try {
        const result = fn?.() as unknown;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          throw new Error(`describe("${name}") callback must be synchronous. Move async work into it()/beforeAll().`);
        }
      } finally {
        this.current = prev;
      }
    };
    const addTest = (name: string, fn?: TestFn, timeout?: number, flags: { skip?: boolean; only?: boolean } = {}) => {
      this.current.children.push({ name, fn, timeout, skip: !!flags.skip || !fn, only: !!flags.only, suite: this.current });
    };

    type Each = <T>(cases: readonly T[]) => (name: string, fn: (...args: any[]) => unknown, timeout?: number) => void;
    const makeEach = (register: (name: string, fn: TestFn, timeout?: number) => void): Each =>
      (cases) => (name, fn, timeout) => {
        cases.forEach((row, index) => {
          const args = Array.isArray(row) ? row : [row];
          register(formatTitle(name, args, index), () => fn(...args), timeout);
        });
      };

    const it = Object.assign((name: string, fn?: TestFn, timeout?: number) => addTest(name, fn, timeout), {
      skip: (name: string, fn?: TestFn) => addTest(name, fn, undefined, { skip: true }),
      only: (name: string, fn?: TestFn, timeout?: number) => addTest(name, fn, timeout, { only: true }),
      todo: (name: string) => addTest(name, undefined, undefined, { skip: true }),
      each: makeEach((name, fn, timeout) => addTest(name, fn, timeout)),
    });
    const describe = Object.assign((name: string, fn: () => void) => addSuite(name, fn), {
      skip: (name: string, fn: () => void) => addSuite(name, fn, { skip: true }),
      only: (name: string, fn: () => void) => addSuite(name, fn, { only: true }),
      each: (<T,>(cases: readonly T[]) => (name: string, fn: (...args: any[]) => void) => {
        cases.forEach((row, index) => {
          const args = Array.isArray(row) ? row : [row];
          addSuite(formatTitle(name, args, index), () => fn(...args));
        });
      }) as Each,
    });

    const timers = this.timers;
    const vi = {
      fn: (impl?: AnyFn) => createMock(impl),
      spyOn: (obj: Record<string, unknown>, method: string) => {
        const original = obj[method];
        if (typeof original !== 'function') throw new TypeError(`vi.spyOn: ${String(method)} is not a function`);
        const spy = createMock(original as AnyFn, () => {
          obj[method] = original;
          this.spies.delete(spy);
        });
        obj[method] = spy;
        this.spies.add(spy);
        return spy;
      },
      isMockFunction: isMock,
      clearAllMocks: () => this.spies.forEach((s) => s.mockClear()),
      resetAllMocks: () => this.spies.forEach((s) => s.mockReset()),
      restoreAllMocks: () => [...this.spies].forEach((s) => s.mockRestore()),
      useFakeTimers: () => (timers.useFakeTimers(), vi),
      useRealTimers: () => (timers.useRealTimers(), vi),
      isFakeTimers: () => timers.fake,
      advanceTimersByTime: (ms: number) => (timers.advanceTimersByTime(ms), vi),
      advanceTimersByTimeAsync: async (ms: number) => (await timers.advanceTimersByTimeAsync(ms), vi),
      advanceTimersToNextTimer: () => {
        const count = timers.getTimerCount();
        if (count) timers.runOnlyPendingTimers();
        return vi;
      },
      runAllTimers: () => (timers.runAllTimers(), vi),
      runAllTimersAsync: async () => (await timers.runAllTimersAsync(), vi),
      runOnlyPendingTimers: () => (timers.runOnlyPendingTimers(), vi),
      getTimerCount: () => timers.getTimerCount(),
      setSystemTime: (t: number | Date) => (timers.setSystemTime(t), vi),
      stubGlobal: (name: string, value: unknown) => {
        if (!this.stubbedGlobals.has(name)) this.stubbedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true, enumerable: true });
        return vi;
      },
      unstubAllGlobals: () => (this.unstubGlobals(), vi),
      waitFor: async <T,>(callback: () => T | Promise<T>, options: { timeout?: number; interval?: number } | number = {}) => {
        const { timeout = 1000, interval = 50 } = typeof options === 'number' ? { timeout: options } : options;
        const start = Date.now();
        for (;;) {
          try {
            return await callback();
          } catch (err) {
            if (Date.now() - start > timeout) throw err;
            await timers.realDelay(interval);
          }
        }
      },
    };

    const expect = this.createExpect();
    return {
      describe,
      suite: describe,
      it,
      test: it,
      expect,
      vi,
      vitest: vi,
      beforeAll: (fn: Hook) => this.current.beforeAll.push(fn),
      afterAll: (fn: Hook) => this.current.afterAll.push(fn),
      beforeEach: (fn: Hook) => this.current.beforeEach.push(fn),
      afterEach: (fn: Hook) => this.current.afterEach.push(fn),
    };
  }

  private unstubGlobals(): void {
    for (const [name, descriptor] of this.stubbedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as Record<string, unknown>)[name];
    }
    this.stubbedGlobals.clear();
  }

  // -- expect ----------------------------------------------------------------
  private createExpect() {
    const timers = this.timers;
    type Matchers = Record<string, (...args: any[]) => unknown>;

    const build = (received: unknown, negate: boolean, mode: 'sync' | 'resolves' | 'rejects'): Matchers => {
      const assert = (pass: boolean, message: () => string) => {
        if (pass === negate) throw new AssertionError(message());
      };
      const not = negate ? 'not.' : '';
      const fmt = (v: unknown) => formatValue(v);
      const diff = (matcher: string, expected: unknown, actual: unknown = received) =>
        `expect(received).${not}${matcher}(expected)\n\nExpected: ${negate ? 'not ' : ''}${fmt(expected)}\nReceived: ${fmt(actual)}`;

      const requireMock = (name: string): Mock => {
        if (!isMock(received)) throw new AssertionError(`${name}() expects a mock function created with vi.fn() or vi.spyOn(), received ${fmt(received)}`);
        return received;
      };
      const requireElement = (name: string): Element => {
        if (typeof Element === 'undefined' || !(received instanceof Element)) {
          throw new AssertionError(`${name}() expects a DOM element, received ${fmt(received)}`);
        }
        return received;
      };
      const callsText = (mock: Mock) =>
        mock.mock.calls.length ? mock.mock.calls.map((c, i) => `  ${i + 1}: ${fmt(c)}`).join('\n') : '  (no calls)';

      const textMatches = (text: string, expected: string | RegExp) =>
        typeof expected === 'string' ? text.includes(expected) : expected.test(text);
      const normalizeText = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

      const matchers: Matchers = {
        toBe: (expected: unknown) =>
          assert(Object.is(received, expected), () => {
            const hint = !Object.is(received, expected) && deepEqual(received, expected) ? '\n\nThe values are deeply equal — use toEqual() to compare structure.' : '';
            return diff('toBe', expected) + hint;
          }),
        toEqual: (expected: unknown) => assert(deepEqual(received, expected), () => diff('toEqual', expected)),
        toStrictEqual: (expected: unknown) => assert(deepEqual(received, expected, true), () => diff('toStrictEqual', expected)),
        toMatchObject: (expected: unknown) => assert(matchObject(received, expected), () => diff('toMatchObject', expected)),
        toBeTruthy: () => assert(!!received, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be truthy`),
        toBeFalsy: () => assert(!received, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be falsy`),
        toBeNull: () => assert(received === null, () => diff('toBeNull', null)),
        toBeUndefined: () => assert(received === undefined, () => diff('toBeUndefined', undefined)),
        toBeDefined: () => assert(received !== undefined, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be defined`),
        toBeNaN: () => assert(Number.isNaN(received), () => diff('toBeNaN', NaN)),
        toBeGreaterThan: (n: number) => assert((received as number) > n, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be > ${fmt(n)}`),
        toBeGreaterThanOrEqual: (n: number) => assert((received as number) >= n, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be >= ${fmt(n)}`),
        toBeLessThan: (n: number) => assert((received as number) < n, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be < ${fmt(n)}`),
        toBeLessThanOrEqual: (n: number) => assert((received as number) <= n, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be <= ${fmt(n)}`),
        toBeCloseTo: (n: number, digits = 2) =>
          assert(Math.abs((received as number) - n) < 10 ** -digits / 2, () => diff(`toBeCloseTo`, n)),
        toBeInstanceOf: (ctor: AnyFn) =>
          assert(received instanceof ctor, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be an instance of ${ctor?.name}`),
        toBeTypeOf: (type: string) => assert(typeof received === type, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to be of type ${type} (got ${typeof received})`),
        toContain: (item: unknown) => {
          const pass =
            typeof received === 'string'
              ? received.includes(item as string)
              : received != null && typeof (received as Iterable<unknown>)[Symbol.iterator] === 'function'
                ? [...(received as Iterable<unknown>)].includes(item)
                : typeof DOMTokenList !== 'undefined' && received instanceof DOMTokenList
                  ? received.contains(item as string)
                  : false;
          assert(pass, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to contain ${fmt(item)}`);
        },
        toContainEqual: (item: unknown) =>
          assert([...((received as Iterable<unknown>) ?? [])].some((x) => deepEqual(x, item)), () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to contain an item equal to ${fmt(item)}`),
        toHaveLength: (n: number) =>
          assert((received as { length?: number })?.length === n, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to have length ${n} (got ${(received as { length?: number })?.length})`),
        toHaveProperty: (path: string | string[], ...rest: unknown[]) => {
          const parts = Array.isArray(path) ? path : path.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
          let cur: unknown = received;
          let found = true;
          for (const p of parts) {
            if (cur != null && (typeof cur === 'object' || typeof cur === 'function') && p in (cur as object)) cur = (cur as Record<string, unknown>)[p];
            else if (cur != null && typeof cur === 'string' && p === 'length') cur = cur.length;
            else {
              found = false;
              break;
            }
          }
          const pass = found && (rest.length === 0 || deepEqual(cur, rest[0]));
          assert(pass, () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to have property "${parts.join('.')}"${rest.length ? ` equal to ${fmt(rest[0])} (got ${found ? fmt(cur) : 'nothing'})` : ''}`);
        },
        toMatch: (pattern: string | RegExp) =>
          assert(typeof received === 'string' && textMatches(received, pattern), () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to match ${fmt(pattern)}`),
        toSatisfy: (predicate: (v: unknown) => boolean) => assert(!!predicate(received), () => `expected ${fmt(received)} ${negate ? 'not ' : ''}to satisfy the predicate`),
        toThrow: (expected?: string | RegExp | AnyFn | Error) => {
          let thrown: unknown;
          let didThrow = false;
          if (mode === 'rejects') {
            didThrow = true;
            thrown = received;
          } else if (typeof received === 'function') {
            try {
              (received as AnyFn)();
            } catch (err) {
              didThrow = true;
              thrown = err;
            }
          } else {
            throw new AssertionError(`toThrow() expects a function, e.g. expect(() => fn()).toThrow(). Received ${fmt(received)}`);
          }
          const message = thrown instanceof Error ? thrown.message : String(thrown);
          let pass = didThrow;
          let detail = '';
          if (didThrow && expected !== undefined) {
            if (typeof expected === 'string') pass = message.includes(expected);
            else if (expected instanceof RegExp) pass = expected.test(message);
            else if (expected instanceof Error) pass = message === expected.message;
            else if (typeof expected === 'function') pass = thrown instanceof expected;
            detail = ` matching ${expected instanceof Error ? fmt(expected.message) : typeof expected === 'function' ? expected.name : fmt(expected)}`;
          }
          assert(pass, () =>
            didThrow
              ? `expected function ${negate ? 'not ' : ''}to throw${detail}, but it threw ${thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : fmt(thrown)}`
              : `expected function to throw${detail}, but it did not throw`,
          );
        },
        toHaveBeenCalled: () => {
          const mock = requireMock('toHaveBeenCalled');
          assert(mock.mock.calls.length > 0, () => `expected mock ${negate ? 'not ' : ''}to have been called, but it was called ${mock.mock.calls.length} time(s)`);
        },
        toHaveBeenCalledTimes: (n: number) => {
          const mock = requireMock('toHaveBeenCalledTimes');
          assert(mock.mock.calls.length === n, () => `expected mock ${negate ? 'not ' : ''}to have been called ${n} time(s), but it was called ${mock.mock.calls.length} time(s)\n\nCalls:\n${callsText(mock)}`);
        },
        toHaveBeenCalledWith: (...args: unknown[]) => {
          const mock = requireMock('toHaveBeenCalledWith');
          assert(mock.mock.calls.some((call) => deepEqual(call, args)), () => `expected mock ${negate ? 'not ' : ''}to have been called with ${fmt(args)}\n\nCalls:\n${callsText(mock)}`);
        },
        toHaveBeenLastCalledWith: (...args: unknown[]) => {
          const mock = requireMock('toHaveBeenLastCalledWith');
          assert(deepEqual(mock.mock.lastCall, args), () => `expected last call ${negate ? 'not ' : ''}to be ${fmt(args)}, got ${fmt(mock.mock.lastCall)}`);
        },
        toHaveBeenNthCalledWith: (n: number, ...args: unknown[]) => {
          const mock = requireMock('toHaveBeenNthCalledWith');
          assert(deepEqual(mock.mock.calls[n - 1], args), () => `expected call #${n} ${negate ? 'not ' : ''}to be ${fmt(args)}, got ${fmt(mock.mock.calls[n - 1])}`);
        },
        toHaveReturnedWith: (value: unknown) => {
          const mock = requireMock('toHaveReturnedWith');
          assert(mock.mock.results.some((r) => r.type === 'return' && deepEqual(r.value, value)), () => `expected mock ${negate ? 'not ' : ''}to have returned ${fmt(value)}`);
        },

        // ---- jest-dom style matchers (available where a DOM exists) ----
        toBeInTheDocument: () => {
          const pass = typeof Element !== 'undefined' && received instanceof Element && received.ownerDocument.contains(received);
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to be in the document${received == null ? ' (received null — the query found nothing)' : ''}`);
        },
        toHaveTextContent: (expected: string | RegExp) => {
          const el = requireElement('toHaveTextContent');
          const text = normalizeText(el.textContent);
          assert(textMatches(text, expected), () => `expected element ${negate ? 'not ' : ''}to have text content ${fmt(expected)}\nReceived text: ${fmt(text)}`);
        },
        toHaveAttribute: (name: string, value?: unknown) => {
          const el = requireElement('toHaveAttribute');
          const has = el.hasAttribute(name);
          const actual = el.getAttribute(name);
          const pass = value === undefined ? has : has && (isAsymmetric(value) ? value.matches(actual) : actual === String(value));
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to have attribute ${name}${value === undefined ? '' : `=${fmt(value)}`} (got ${has ? fmt(actual) : 'no attribute'})`);
        },
        toHaveClass: (...names: string[]) => {
          const el = requireElement('toHaveClass');
          const classes = names.flatMap((n) => n.split(/\s+/)).filter(Boolean);
          const pass = classes.length ? classes.every((c) => el.classList.contains(c)) : el.classList.length > 0;
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to have class ${fmt(classes.join(' '))} (has ${fmt(el.className)})`);
        },
        toHaveValue: (value: unknown) => {
          const el = requireElement('toHaveValue') as HTMLInputElement;
          let actual: unknown = el.value;
          if (el.type === 'number') actual = el.value === '' ? null : Number(el.value);
          if (el instanceof HTMLSelectElement && el.multiple) actual = [...el.selectedOptions].map((o) => o.value);
          assert(deepEqual(actual, value), () => diff('toHaveValue', value, actual));
        },
        toBeDisabled: () => {
          const el = requireElement('toBeDisabled');
          const pass = (el as HTMLButtonElement).disabled === true || !!el.closest('fieldset[disabled]');
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to be disabled`);
        },
        toBeEnabled: () => {
          const el = requireElement('toBeEnabled');
          const disabled = (el as HTMLButtonElement).disabled === true || !!el.closest('fieldset[disabled]');
          assert(!disabled, () => `expected element ${negate ? 'not ' : ''}to be enabled`);
        },
        toBeChecked: () => {
          const el = requireElement('toBeChecked') as HTMLInputElement;
          const aria = el.getAttribute('aria-checked');
          const pass = 'checked' in el && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : aria === 'true';
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to be checked`);
        },
        toHaveFocus: () => {
          const el = requireElement('toHaveFocus');
          assert(el.ownerDocument.activeElement === el, () => `expected element ${negate ? 'not ' : ''}to have focus. Focused element: ${fmt(el.ownerDocument.activeElement)}`);
        },
        toBeVisible: () => {
          const el = requireElement('toBeVisible');
          let pass = el.ownerDocument.contains(el);
          for (let node: Element | null = el; pass && node; node = node.parentElement) {
            const style = node.ownerDocument.defaultView?.getComputedStyle(node);
            if (node.hasAttribute('hidden') || style?.display === 'none' || style?.visibility === 'hidden' || style?.opacity === '0') pass = false;
            if (node.tagName === 'DETAILS' && !(node as HTMLDetailsElement).open && node !== el && !(el.tagName === 'SUMMARY')) pass = false;
          }
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to be visible`);
        },
        toBeEmptyDOMElement: () => {
          const el = requireElement('toBeEmptyDOMElement');
          assert(el.innerHTML.trim() === '', () => `expected element ${negate ? 'not ' : ''}to be empty, but it contains ${fmt(el.innerHTML)}`);
        },
        toContainElement: (child: Element | null) => {
          const el = requireElement('toContainElement');
          assert(!!child && el.contains(child), () => `expected element ${negate ? 'not ' : ''}to contain ${fmt(child)}`);
        },
        toHaveStyle: (css: Record<string, string>) => {
          const el = requireElement('toHaveStyle');
          const style = el.ownerDocument.defaultView?.getComputedStyle(el);
          const entries = Object.entries(css);
          const pass = entries.every(([prop, value]) => {
            const kebab = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            return style?.getPropertyValue(kebab).trim() === String(value);
          });
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to have style ${fmt(css)}`);
        },
        toHaveAccessibleName: (expected?: string | RegExp) => {
          const el = requireElement('toHaveAccessibleName');
          const compute = (this.builtins['dom-accessibility-api'] as { computeAccessibleName?: (e: Element) => string } | undefined)?.computeAccessibleName;
          if (!compute) throw new AssertionError('toHaveAccessibleName() is only available in the DOM sandbox');
          const name = compute(el);
          const pass = expected === undefined ? name !== '' : textMatches(name, expected) && (typeof expected !== 'string' || name === expected);
          assert(pass, () => `expected element ${negate ? 'not ' : ''}to have accessible name ${expected === undefined ? '(any)' : fmt(expected)}\nReceived name: ${fmt(name)}`);
        },
      };
      matchers.toThrowError = matchers.toThrow;
      matchers.toBeCalled = matchers.toHaveBeenCalled;
      matchers.toBeCalledTimes = matchers.toHaveBeenCalledTimes;
      matchers.toBeCalledWith = matchers.toHaveBeenCalledWith;
      return matchers;
    };

    const wrapAsync = (promise: unknown, mode: 'resolves' | 'rejects', negate: boolean) => {
      const proxy: Matchers = {};
      const names = Object.keys(build(undefined, false, 'sync'));
      for (const name of names) {
        proxy[name] = async (...args: unknown[]) => {
          if (!promise || typeof (promise as Promise<unknown>).then !== 'function') {
            throw new AssertionError(`expect(...).${mode} requires a promise, received ${formatValue(promise)}`);
          }
          let value: unknown;
          try {
            value = await promise;
          } catch (err) {
            if (mode === 'resolves') throw new AssertionError(`expected promise to resolve, but it rejected with ${errorToString(err)}`);
            return build(err, negate, 'rejects')[name](...args);
          }
          if (mode === 'rejects') throw new AssertionError(`expected promise to reject, but it resolved with ${formatValue(value)}`);
          return build(value, negate, 'resolves')[name](...args);
        };
      }
      return proxy;
    };

    const expect = (received: unknown) => {
      const matchers = build(received, false, 'sync') as Matchers & {
        not: Matchers;
        resolves: Matchers & { not: Matchers };
        rejects: Matchers & { not: Matchers };
      };
      matchers.not = build(received, true, 'sync');
      matchers.resolves = Object.assign(wrapAsync(received, 'resolves', false), { not: wrapAsync(received, 'resolves', true) });
      matchers.rejects = Object.assign(wrapAsync(received, 'rejects', false), { not: wrapAsync(received, 'rejects', true) });
      return matchers;
    };

    return Object.assign(expect, {
      any: (ctor: AnyFn) =>
        asymmetric(`Any<${ctor.name}>`, (v) =>
          ctor === Number ? typeof v === 'number' || v instanceof Number
          : ctor === String ? typeof v === 'string' || v instanceof String
          : ctor === Boolean ? typeof v === 'boolean' || v instanceof Boolean
          : ctor === Function ? typeof v === 'function'
          : ctor === Object ? typeof v === 'object' && v !== null
          : v instanceof ctor,
        ),
      anything: () => asymmetric('Anything', (v) => v !== null && v !== undefined),
      objectContaining: (obj: object) => asymmetric(`ObjectContaining ${formatValue(obj)}`, (v) => matchObject(v, obj)),
      arrayContaining: (arr: unknown[]) =>
        asymmetric(`ArrayContaining ${formatValue(arr)}`, (v) => Array.isArray(v) && arr.every((item) => v.some((x) => deepEqual(x, item)))),
      stringContaining: (s: string) => asymmetric(`StringContaining ${JSON.stringify(s)}`, (v) => typeof v === 'string' && v.includes(s)),
      stringMatching: (re: string | RegExp) =>
        asymmetric(`StringMatching ${String(re)}`, (v) => typeof v === 'string' && (typeof re === 'string' ? v.includes(re) : re.test(v))),
      // Vitest exposes these on expect as well.
      soft: expect,
      _timers: timers,
    });
  }

  // -- running -----------------------------------------------------------------
  private collect(): { test: TestCase; path: Suite[] }[] {
    const out: { test: TestCase; path: Suite[] }[] = [];
    const walk = (suite: Suite, path: Suite[]) => {
      for (const child of suite.children) {
        if (isSuite(child)) walk(child, [...path, child]);
        else out.push({ test: child, path });
      }
    };
    walk(this.root, []);
    return out;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let handle: unknown;
    const timeout = new Promise<never>((_, reject) => {
      handle = this.timers.scheduleReal(
        () => reject(new Error(`${label} timed out after ${ms}ms. Did you forget to resolve a promise, await something, or advance fake timers?`)),
        ms,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      this.timers.cancelReal(handle);
    }
  }

  async run(): Promise<RunSummary> {
    const started = this.timers.currentPerf();
    const entries = this.collect();
    const hasOnly = entries.some(({ test, path }) => test.only || path.some((s) => s.only));
    const results: TestResult[] = [];
    const ranBeforeAll = new Set<Suite>();

    if (entries.length === 0) {
      return { results, error: 'No tests found. Make sure the test file calls it()/test().', durationMs: 0 };
    }

    for (let index = 0; index < entries.length; index++) {
      const { test, path } = entries[index];
      const fullName = [...path.map((s) => s.name), test.name].filter(Boolean).join(' › ');
      const skipped = test.skip || path.some((s) => s.skip) || (hasOnly && !(test.only || path.some((s) => s.only)));
      if (skipped) {
        results.push({ name: fullName, status: 'skip', durationMs: 0 });
        continue;
      }
      const t0 = this.timers.currentPerf();
      let error: unknown;
      try {
        for (const suite of [this.root, ...path]) {
          if (!ranBeforeAll.has(suite)) {
            ranBeforeAll.add(suite);
            for (const hook of suite.beforeAll) await this.withTimeout(Promise.resolve().then(hook), this.testTimeout, 'beforeAll hook');
          }
        }
        for (const suite of [this.root, ...path]) {
          for (const hook of suite.beforeEach) await this.withTimeout(Promise.resolve().then(hook), this.testTimeout, 'beforeEach hook');
        }
        await this.withTimeout(Promise.resolve().then(() => test.fn!()), test.timeout ?? this.testTimeout, `Test "${test.name}"`);
      } catch (err) {
        error = err;
      }
      try {
        for (const suite of [...path].reverse().concat(this.root)) {
          for (const hook of suite.afterEach) await this.withTimeout(Promise.resolve().then(hook), this.testTimeout, 'afterEach hook');
        }
      } catch (err) {
        error ??= err;
      }
      try {
        await this.afterEachTest?.();
      } catch (err) {
        error ??= err;
      }
      this.timers.useRealTimers();
      [...this.spies].forEach((s) => s.mockRestore());
      this.unstubGlobals();

      // Run afterAll hooks for suites that have no remaining tests.
      const remaining = entries.slice(index + 1);
      for (const suite of [...path].reverse()) {
        if (ranBeforeAll.has(suite) && !remaining.some((e) => e.path.includes(suite))) {
          for (const hook of suite.afterAll) {
            try {
              await hook();
            } catch (err) {
              error ??= err;
            }
          }
        }
      }
      if (remaining.length === 0) {
        for (const hook of this.root.afterAll) {
          try {
            await hook();
          } catch (err) {
            error ??= err;
          }
        }
      }

      const durationMs = Math.round(this.timers.currentPerf() - t0);
      results.push(error === undefined ? { name: fullName, status: 'pass', durationMs } : { name: fullName, status: 'fail', error: errorToString(error), durationMs });
    }
    this.timers.clearAllReal();
    return { results, durationMs: Math.round(this.timers.currentPerf() - started) };
  }
}

/**
 * Load modules, evaluate the test entry (which registers tests) and run them.
 */
export async function runTestModules(modules: ModuleMap, entry: string, options: RuntimeOptions = {}): Promise<RunSummary> {
  const runtime = new TestRuntime(options);
  runtime.loadModules(modules);
  try {
    runtime.require(entry);
  } catch (err) {
    runtime.timers.clearAllReal();
    return { results: [], error: errorToString(err), durationMs: 0 };
  }
  try {
    return await runtime.run();
  } catch (err) {
    return { results: [], error: errorToString(err), durationMs: 0 };
  }
}

/**
 * Run a script (playground / runnable lesson snippet). Resolves when the
 * script finished and its pending timeouts have fired, or after `maxWaitMs`.
 */
export async function runScript(
  code: string,
  options: RuntimeOptions & { maxWaitMs?: number } = {},
): Promise<{ error?: string; timedOut: boolean }> {
  const runtime = new TestRuntime(options);
  try {
    await runtime.evaluateAsync('main', code);
  } catch (err) {
    runtime.timers.clearAllReal();
    return { error: errorToString(err), timedOut: false };
  }
  const maxWait = options.maxWaitMs ?? 4000;
  const start = Date.now();
  // Let pending timeouts (setTimeout chains) settle.
  for (;;) {
    await runtime.timers.realTick();
    if (runtime.timers.pendingRealTimeouts() === 0 && runtime.timers.pendingReal.size === 0) break;
    if (runtime.timers.pendingRealTimeouts() === 0 && runtime.timers.pendingReal.size > 0 && Date.now() - start > 1500) {
      runtime.timers.clearAllReal();
      return { timedOut: true };
    }
    if (Date.now() - start > maxWait) {
      runtime.timers.clearAllReal();
      return { timedOut: true };
    }
    await runtime.timers.realDelay(10);
  }
  return { timedOut: false };
}
