/**
 * TypeScript compiler service: transpiles TS/TSX to CommonJS for the test
 * runtime and type-checks code against real lib.dom / lib.es20xx and React
 * typings held in an in-memory file system.
 *
 * The `typescript` module and the declaration files are injected so the same
 * code works in a Web Worker (files bundled with Vite `?raw` imports) and in
 * Node (files read from node_modules).
 */
import type * as TS from 'typescript';
import type { TestResult } from './harness';

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

export type FileProvider = Record<string, () => Promise<string>>;

export interface TsServiceDeps {
  ts: typeof TS;
  /** Keyed by lib file name, e.g. "lib.es5.d.ts". */
  libFiles: FileProvider;
  /** Keyed by absolute virtual path, e.g. "/node_modules/@types/react/index.d.ts". */
  typeFiles: FileProvider;
}

export interface TranspileResult {
  code: string;
  diagnostics: Diagnostic[];
}

export const ROOT_LIBS = ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'];

/** Helper module made available to type challenges as `./type-utils`. */
export const TYPE_UTILS_SOURCE = `/** True when X and Y are exactly the same type (distinguishes any, readonly, optional…). */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;
/** Compile-time assertion: Expect<true> compiles, Expect<false> is an error. */
export type Expect<T extends true> = T;
export type ExpectFalse<T extends false> = T;
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type IsTrue<T extends true> = T;
export type IsFalse<T extends false> = T;
`;

export function createTsService(deps: TsServiceDeps) {
  const { ts } = deps;
  const loadedText = new Map<string, string>();
  const sourceFileCache = new Map<string, TS.SourceFile>();

  const transpileOptions: TS.CompilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    isolatedModules: true,
    useDefineForClassFields: true,
    sourceMap: false,
  };

  const checkOptions: TS.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ROOT_LIBS,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    isolatedModules: true,
    allowImportingTsExtensions: true,
    types: [],
  };

  function toDiagnostic(d: TS.Diagnostic): Diagnostic {
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      return { file: d.file.fileName.replace(/^\//, ''), line: line + 1, column: character + 1, message, code: d.code };
    }
    return { file: '', line: 0, column: 0, message, code: d.code };
  }

  function transpile(source: string, fileName: string): TranspileResult {
    const out = ts.transpileModule(source, {
      fileName,
      reportDiagnostics: true,
      compilerOptions: transpileOptions,
    });
    return { code: out.outputText, diagnostics: (out.diagnostics ?? []).map(toDiagnostic) };
  }

  async function loadLib(name: string): Promise<void> {
    const key = `/${name}`;
    if (loadedText.has(key)) return;
    const loader = deps.libFiles[name];
    if (!loader) return;
    const text = await loader();
    loadedText.set(key, text);
    const refs = [...text.matchAll(/\/\/\/\s*<reference\s+lib="([^"]+)"/g)].map((m) => `lib.${m[1].toLowerCase()}.d.ts`);
    await Promise.all(refs.map(loadLib));
  }

  let typesLoaded: Promise<void> | undefined;
  function loadTypes(): Promise<void> {
    typesLoaded ??= Promise.all(
      Object.entries(deps.typeFiles).map(async ([path, loader]) => {
        loadedText.set(path, await loader());
      }),
    ).then(() => undefined);
    return typesLoaded;
  }

  let libsLoaded: Promise<void> | undefined;
  function loadLibs(): Promise<void> {
    libsLoaded ??= Promise.all(ROOT_LIBS.map(loadLib)).then(() => undefined);
    return libsLoaded;
  }

  /**
   * Type-check a set of user files (keys are bare file names like
   * "solution.ts"). Returns diagnostics for the user files only.
   */
  async function typecheck(files: Record<string, string>): Promise<Diagnostic[]> {
    await Promise.all([loadLibs(), loadTypes()]);
    const userFiles = new Map(Object.entries(files).map(([name, text]) => [`/${name.replace(/^\.?\//, '')}`, text]));

    const host: TS.CompilerHost = {
      getSourceFile: (fileName, languageVersion) => {
        const userText = userFiles.get(fileName);
        if (userText !== undefined) return ts.createSourceFile(fileName, userText, languageVersion, true);
        const cached = sourceFileCache.get(fileName);
        if (cached) return cached;
        const text = loadedText.get(fileName);
        if (text === undefined) return undefined;
        const sf = ts.createSourceFile(fileName, text, languageVersion, true);
        sourceFileCache.set(fileName, sf);
        return sf;
      },
      getDefaultLibFileName: () => '/lib.d.ts',
      getDefaultLibLocation: () => '/',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getDirectories: () => [],
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (f) => userFiles.has(f) || loadedText.has(f),
      readFile: (f) => userFiles.get(f) ?? loadedText.get(f),
    };

    const program = ts.createProgram({ rootNames: [...userFiles.keys()], options: checkOptions, host });
    const diagnostics = [
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...[...userFiles.keys()].flatMap((f) => {
        const sf = program.getSourceFile(f);
        return sf ? [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)] : [];
      }),
    ];
    return diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).map(toDiagnostic);
  }

  return { transpile, typecheck, warmup: () => Promise.all([loadLibs(), loadTypes()]) };
}

export type TsService = ReturnType<typeof createTsService>;

// ---------------------------------------------------------------------------
// Type challenge evaluation
// ---------------------------------------------------------------------------

const CASE_MARKER = /^\s*\/\/\s*test\s*:\s*(.+?)\s*$/;

export interface TypeCase {
  name: string;
  startLine: number;
  endLine: number;
}

/** Split a type-test file into cases. Each case starts with a `// test: description` comment. */
export function parseTypeCases(source: string): TypeCase[] {
  const lines = source.split('\n');
  const cases: TypeCase[] = [];
  lines.forEach((line, i) => {
    const m = CASE_MARKER.exec(line);
    if (m) {
      if (cases.length) cases[cases.length - 1].endLine = i;
      cases.push({ name: m[1], startLine: i + 1, endLine: lines.length });
    }
  });
  return cases;
}

export interface TypeCheckOutcome {
  results: TestResult[];
  /** Errors in the user's own file. */
  solutionErrors: Diagnostic[];
  /** Errors in the test file that are not inside any case (setup problems). */
  setupErrors: Diagnostic[];
}

export function evaluateTypeCases(testsSource: string, diagnostics: Diagnostic[], testsFile = 'solution.test.ts', solutionFile = 'solution.ts'): TypeCheckOutcome {
  const cases = parseTypeCases(testsSource);
  const testDiags = diagnostics.filter((d) => d.file === testsFile);
  const solutionErrors = diagnostics.filter((d) => d.file === solutionFile);
  const setupErrors = testDiags.filter((d) => !cases.some((c) => d.line >= c.startLine && d.line <= c.endLine));
  const results: TestResult[] = cases.map((c) => {
    const errs = testDiags.filter((d) => d.line >= c.startLine && d.line <= c.endLine);
    if (errs.length === 0) return { name: c.name, status: 'pass', durationMs: 0 };
    const error = errs
      .map((d) => {
        if (d.code === 2578) return `Expected a type error here (@ts-expect-error), but the code compiled.`;
        if (d.code === 2344 && /'false'.*'true'|does not satisfy the constraint 'true'/s.test(d.message)) {
          return `Type assertion failed (line ${d.line}): the types are not equal.\n${d.message}`;
        }
        return `Line ${d.line}: ${d.message}`;
      })
      .join('\n');
    return { name: c.name, status: 'fail', error, durationMs: 0 };
  });
  return { results, solutionErrors, setupErrors };
}
