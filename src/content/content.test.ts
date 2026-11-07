// @vitest-environment jsdom
/**
 * Content validation. Run for one day while authoring:
 *   npx vitest run src/content -t "day 05"
 */
import { describe, expect, it } from 'vitest';
import type { Block, Day, Exercise, LabBlock, QuizQuestion } from './types';
import { nodeCompiler, nodeTsService } from '../runner/nodeEnv';
import { domExecutor } from '../runner/domEnv';
import { runTestModules } from '../runner/harness';
import { runExercise, type Executor } from '../runner/exerciseRunner';

const dayLoaders = import.meta.glob<{ default: Day }>('./days/day*/index.ts');
const labLoaders = import.meta.glob<{ default: LabBlock }>('./labs/day*/index.ts');

const logicExecutor: Executor = (modules, entry, onLog) => runTestModules(modules, entry, { onLog, testTimeout: 5000 });
const executorFor = (ex: Exercise): Executor => (ex.runtime === 'dom' ? domExecutor : logicExecutor);

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CALLOUT = /^>\s*\[!(\w+)\]/gm;
const ALLOWED_CALLOUTS = new Set(['TIP', 'NOTE', 'WARNING', 'INTERVIEW', 'MISTAKE', 'AGENT']);

function checkMarkdown(md: string, where: string) {
  expect(md.trim().length, `${where}: empty markdown`).toBeGreaterThan(0);
  for (const m of md.matchAll(CALLOUT)) {
    expect(ALLOWED_CALLOUTS.has(m[1]), `${where}: unknown callout [!${m[1]}]`).toBe(true);
  }
  const fences = md.match(/^```/gm)?.length ?? 0;
  expect(fences % 2, `${where}: unbalanced code fences`).toBe(0);
}

function runnableBlocks(md: string): string[] {
  return [...md.matchAll(/^```(?:ts|js|typescript|javascript) run\s*\n([\s\S]*?)^```/gm)].map((m) => m[1]);
}

function checkQuiz(q: QuizQuestion, where: string) {
  expect(q.id, `${where}: bad id`).toMatch(ID);
  expect(q.choices.length, `${where}/${q.id}: needs 2-6 choices`).toBeGreaterThanOrEqual(2);
  expect(q.choices.length).toBeLessThanOrEqual(6);
  expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${where}/${q.id}: answer index out of range`).toBe(true);
  expect(new Set(q.choices).size, `${where}/${q.id}: duplicate choices`).toBe(q.choices.length);
  checkMarkdown(q.prompt, `${where}/${q.id} prompt`);
  checkMarkdown(q.explanation, `${where}/${q.id} explanation`);
}

function checkBlock(block: Block, day: Day, where: string) {
  expect(block.id, `${where}: block id`).toMatch(ID);
  expect(block.minutes, `${where}: minutes`).toBeGreaterThan(0);
  switch (block.kind) {
    case 'lesson': {
      checkMarkdown(block.body, `${where} body`);
      const checkIds = new Set((block.checks ?? []).map((q) => q.id));
      for (const m of block.body.matchAll(/\{\{quiz:([^}]+)\}\}/g)) {
        expect(checkIds.has(m[1]), `${where}: {{quiz:${m[1]}}} has no matching check`).toBe(true);
      }
      (block.checks ?? []).forEach((q) => checkQuiz(q, where));
      break;
    }
    case 'quiz':
      expect(block.questions.length, `${where}: quiz needs questions`).toBeGreaterThan(0);
      block.questions.forEach((q) => checkQuiz(q, where));
      break;
    case 'lab':
      checkMarkdown(block.body, `${where} body`);
      expect(block.checklist.length, `${where}: checklist`).toBeGreaterThan(0);
      break;
    case 'drill':
      for (const id of block.questionIds ?? []) {
        expect(day.interviewQuestions.some((q) => q.id === id), `${where}: unknown question ${id}`).toBe(true);
      }
      break;
    case 'exercise':
      expect(block.exercises.length, `${where}: needs exercises`).toBeGreaterThan(0);
      checkMarkdown(block.intro, `${where} intro`);
      break;
    case 'review':
      break;
  }
}

describe.each(Object.keys(dayLoaders).sort())('%s', (path) => {
  const label = path.replace(/^\.\/days\/day0?(\d+)\/index\.ts$/, 'day $1');
  const dayNumberStr = path.match(/day(\d+)/)![1];

  it(`${label} › structure`, async () => {
    const day = (await dayLoaders[path]()).default;
    expect(day.number).toBe(Number(dayNumberStr));
    expect(day.objectives.length).toBeGreaterThan(0);
    expect(day.skills.length).toBeGreaterThan(0);
    checkMarkdown(day.summary, `${label} summary`);

    const ids = new Set<string>();
    for (const block of day.blocks) {
      expect(ids.has(block.id), `${label}: duplicate block id ${block.id}`).toBe(false);
      ids.add(block.id);
      checkBlock(block, day, `${label}/${block.id}`);
    }
    const lab = (await labLoaders[`./labs/day${dayNumberStr}/index.ts`]?.())?.default;
    if (lab) checkBlock(lab, day, `${label}/lab:${lab.id}`);
    const minutes = day.blocks.reduce((s, b) => s + b.minutes, 0) + (lab && !ids.has(lab.id) ? lab.minutes : 0);
    expect(minutes, `${label}: total minutes (incl. injected lab) should be ~240`).toBeGreaterThanOrEqual(220);
    expect(minutes).toBeLessThanOrEqual(260);

    const cardIds = new Set<string>();
    expect(day.flashcards.length, `${label}: flashcards`).toBeGreaterThanOrEqual(10);
    for (const card of day.flashcards) {
      expect(card.id).toMatch(ID);
      expect(cardIds.has(card.id), `${label}: duplicate card ${card.id}`).toBe(false);
      cardIds.add(card.id);
      checkMarkdown(card.front, `${label}/card ${card.id}`);
      checkMarkdown(card.back, `${label}/card ${card.id}`);
    }
    expect(day.interviewQuestions.length, `${label}: interview questions`).toBeGreaterThanOrEqual(5);
    for (const q of day.interviewQuestions) {
      expect(q.id).toMatch(ID);
      checkMarkdown(q.question, `${label}/iq ${q.id}`);
      checkMarkdown(q.answer, `${label}/iq ${q.id}`);
    }
  });

  it(`${label} › runnable snippets compile and run`, async () => {
    const day = (await dayLoaders[path]()).default;
    const lab = (await labLoaders[`./labs/day${dayNumberStr}/index.ts`]?.())?.default;
    const bodies = [...day.blocks, ...(lab ? [lab] : [])].flatMap((b) => ('body' in b ? [b.body] : []));
    for (const body of bodies) {
      for (const snippet of runnableBlocks(body)) {
        const out = nodeTsService.transpile(snippet, 'main.ts');
        expect(out.diagnostics, `syntax error in runnable snippet:\n${snippet}`).toEqual([]);
      }
    }
  });

  it(`${label} › exercises: solutions pass, starters fail`, async () => {
    const day = (await dayLoaders[path]()).default;
    const exercises = day.blocks.flatMap((b) => (b.kind === 'exercise' ? b.exercises : []));
    const problems: string[] = [];
    for (const ex of exercises) {
      if (!ID.test(ex.id)) problems.push(`${ex.id}: bad id`);
      if (!ex.hints.length) problems.push(`${ex.id}: needs hints`);
      if (!ex.tags.length) problems.push(`${ex.id}: needs tags`);
      const exec = executorFor(ex);
      const reference = ex.mode === 'write-tests' ? ex.solution : ex.solution;
      const good = await runExercise(ex, reference, nodeCompiler, exec);
      if (!good.passed) {
        problems.push(
          `${ex.id}: reference solution does not pass.\n${good.error ?? ''}\n${good.results
            .filter((r) => r.status !== 'pass')
            .map((r) => `  ✗ ${r.name}: ${r.error}`)
            .join('\n')}\nlogs: ${good.logs.map((l) => l.text).join(' | ').slice(0, 500)}`,
        );
      }
      const bad = await runExercise(ex, ex.starter, nodeCompiler, exec);
      if (bad.passed) problems.push(`${ex.id}: starter code already passes — tests are too weak or starter is a solution.`);
      if (ex.runtime !== 'types') {
        const ext = ex.runtime === 'dom' ? 'tsx' : 'ts';
        const files: Record<string, string> =
          ex.mode === 'write-tests' ? { [`subject.${ext}`]: ex.subject ?? '' } : { [`solution.${ext}`]: ex.solution };
        const diags = await nodeTsService.typecheck(files);
        if (diags.length) problems.push(`${ex.id}: type errors in reference code:\n${diags.map((d) => `  ${d.file}:${d.line} ${d.message}`).join('\n')}`);
      }
    }
    expect(problems, problems.join('\n\n')).toEqual([]);
  });
});
