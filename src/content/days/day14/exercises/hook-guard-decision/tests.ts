import { describe, it, expect } from 'vitest';
import { decide } from './solution';
import type { HookInput, Policy } from './solution';

const policy: Policy = {
  protectedPaths: ['.env*', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'src/generated/**'],
  deniedCommands: ['rm -rf', 'git push --force', 'git reset --hard'],
};

const edit = (file_path: string, cwd?: string): HookInput => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'Edit',
  tool_input: { file_path },
  cwd,
});
const write = (file_path: string): HookInput => ({ ...edit(file_path), tool_name: 'Write' });
const bash = (command: string): HookInput => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command },
});

const expectAllowed = (input: HookInput, p: Policy = policy) => {
  const result = decide(input, p);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBeUndefined();
};
const expectBlocked = (input: HookInput, mentions: string[] = [], p: Policy = policy) => {
  const result = decide(input, p);
  expect(result.exitCode).toBe(2);
  expect(typeof result.stderr).toBe('string');
  for (const text of mentions) expect(result.stderr).toContain(text);
};

describe('decide() — file edits', () => {
  it('allows ordinary source edits', () => {
    expectAllowed(edit('src/components/CommandPalette.tsx'));
    expectAllowed(write('src/hooks/useHotkey.ts'));
  });

  it('blocks .env files by name at any depth, and says which file and pattern', () => {
    expectBlocked(edit('.env'), ['.env', '.env*']);
    expectBlocked(write('.env.local'), ['.env.local']);
    expectBlocked(edit('apps/web/.env.production'), ['apps/web/.env.production']);
  });

  it('blocks lockfiles at any depth', () => {
    expectBlocked(write('package-lock.json'), ['package-lock.json']);
    expectBlocked(edit('packages/ui/pnpm-lock.yaml'), ['pnpm-lock.yaml']);
  });

  it('treats dots in globs literally (".env*" must not match "xenv.ts")', () => {
    expectAllowed(edit('src/xenv.ts'));
    expectAllowed(edit('src/config/environment.ts'));
  });

  it('blocks everything under src/generated/ at any depth — and only that directory', () => {
    expectBlocked(edit('src/generated/api.ts'), ['src/generated/api.ts', 'src/generated/**']);
    expectBlocked(write('src/generated/graphql/types.ts'));
    expectAllowed(edit('src/generated-docs/readme.md'));
    expectAllowed(edit('lib/src/generated/api.ts')); // has a "/", so it matches from the project root
  });

  it('supports * (no slash), ** with a slash (zero or more dirs) and ? (one char)', () => {
    const p: Policy = { protectedPaths: ['src/*.ts', '**/*.snap', 'v?.json'], deniedCommands: [] };
    expectBlocked(edit('src/main.ts'), [], p);
    expectAllowed(edit('src/components/Button.ts'), p); // * does not cross "/"
    expectBlocked(edit('App.snap'), [], p); // **/ matches zero directories
    expectBlocked(edit('src/__snapshots__/deep/App.snap'), [], p);
    expectBlocked(edit('v1.json'), [], p);
    expectAllowed(edit('v10.json'), p); // ? is exactly one character
  });

  it('makes absolute paths inside cwd relative before matching', () => {
    const cwd = '/home/me/fe-gym';
    expectBlocked(edit('/home/me/fe-gym/src/generated/api.ts', cwd), ['src/generated/api.ts']);
    expectBlocked(edit('/home/me/fe-gym/.env', cwd));
    expectAllowed(edit('/home/me/fe-gym/src/App.tsx', cwd));
    expectBlocked(edit('./src/generated/api.ts')); // a leading ./ is ignored
  });

  it('blocks paths outside the project (absolute elsewhere, or containing ..)', () => {
    expectBlocked(edit('/etc/hosts', '/home/me/fe-gym'), ['/etc/hosts', 'outside']);
    expectBlocked(edit('/home/me/fe-gym-other/src/a.ts', '/home/me/fe-gym')); // prefix trap: not inside cwd
    expectBlocked(edit('../other-repo/src/a.ts'), ['outside']);
    expectBlocked(edit('src/../../secrets.ts'), ['outside']);
  });
});

describe('decide() — Bash commands', () => {
  it('blocks denied commands and names the pattern', () => {
    expectBlocked(bash('rm -rf dist'), ['rm -rf']);
    expectBlocked(bash('git push --force origin main'), ['git push --force']);
  });

  it('ignores extra whitespace', () => {
    expectBlocked(bash('rm   -rf    node_modules'), ['rm -rf']);
    expectBlocked(bash('git\treset  --hard HEAD~1'), ['git reset --hard']);
  });

  it('catches denied commands chained after harmless ones, with or without spaces', () => {
    expectBlocked(bash('npm test && rm -rf coverage'));
    expectBlocked(bash('npm test;rm -rf coverage'));
    expectBlocked(bash('(cd dist&&rm -rf assets)'));
  });

  it('matches whole tokens only', () => {
    expectAllowed(bash('git push --force-with-lease'));
    expectAllowed(bash('rm src/old.ts'));
    expectAllowed(bash('npm run test -- --run'));
    expectAllowed(bash('git status && git diff'));
  });
});

describe('decide() — everything else', () => {
  it('allows other tools (reading secrets is the job of permission deny rules, not this hook)', () => {
    expectAllowed({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '.env' } });
    expectAllowed({ hook_event_name: 'PreToolUse', tool_name: 'Grep', tool_input: {} });
  });

  it('allows non-PreToolUse events and calls with nothing to check', () => {
    expectAllowed({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: '.env' } });
    expectAllowed({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: {} });
    expectAllowed({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} });
  });
});
