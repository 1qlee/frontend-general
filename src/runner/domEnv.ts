/**
 * DOM executor for Node validation (jsdom). Mirrors the sandbox iframe.
 */
import { runTestModules, type LogEntry, type ModuleMap } from './harness';
import { createDomBuiltins, domCleanup } from './domBuiltins';
import type { Executor } from './exerciseRunner';

let builtins: Record<string, unknown> | undefined;

export const domExecutor: Executor = (modules: ModuleMap, entry: string, onLog: (e: LogEntry) => void) => {
  builtins ??= createDomBuiltins();
  return runTestModules(modules, entry, { builtins, onLog, afterEachTest: domCleanup, testTimeout: 5000 });
};
