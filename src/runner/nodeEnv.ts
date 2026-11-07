/**
 * Node-side wiring of the runner, used by Vitest to validate course content
 * (every reference solution must pass its tests; every starter must fail).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { runTestModules, type ModuleMap, type LogEntry } from './harness';
import { createTsService, type FileProvider } from './tsService';
import type { Compiler, Executor } from './exerciseRunner';

const root = join(__dirname, '..', '..', 'node_modules');
const libDir = join(root, 'typescript', 'lib');

const libFiles: FileProvider = Object.fromEntries(
  readdirSync(libDir)
    .filter((f) => /^lib\..*\.d\.ts$/.test(f))
    .map((f) => [f, async () => readFileSync(join(libDir, f), 'utf8')]),
);

export const TYPE_FILE_PATHS = [
  '@types/react/index.d.ts',
  '@types/react/global.d.ts',
  '@types/react/jsx-runtime.d.ts',
  '@types/react/jsx-dev-runtime.d.ts',
  '@types/react-dom/index.d.ts',
  '@types/react-dom/client.d.ts',
  'csstype/index.d.ts',
];

const typeFiles: FileProvider = Object.fromEntries(
  TYPE_FILE_PATHS.map((p) => [`/node_modules/${p}`, async () => readFileSync(join(root, p), 'utf8')]),
);

export const nodeTsService = createTsService({ ts, libFiles, typeFiles });

export const nodeCompiler: Compiler = {
  transpile: (source, fileName) => nodeTsService.transpile(source, fileName),
  typecheck: (files) => nodeTsService.typecheck(files),
};

export const logicExecutor: Executor = (modules: ModuleMap, entry: string, onLog: (e: LogEntry) => void) =>
  runTestModules(modules, entry, { onLog, testTimeout: 5000 });
