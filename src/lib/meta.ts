import type { BlockKind, ExerciseRuntime, LabBlock, SkillArea, Block } from '../content/types';
import type { IconName } from '../components/Icon';

export const SKILL_LABELS: Record<SkillArea, string> = {
  javascript: 'JavaScript core',
  async: 'Async & event loop',
  typescript: 'TypeScript',
  react: 'React fundamentals',
  'react-advanced': 'Advanced React',
  browser: 'Browser & DOM',
  css: 'CSS & layout',
  accessibility: 'Accessibility',
  performance: 'Performance',
  networking: 'Networking & HTTP',
  security: 'Web security',
  'system-design': 'Frontend system design',
  testing: 'Testing',
  tooling: 'Tooling & build',
  agentic: 'Agentic dev (Claude Code)',
  interviewing: 'Interview communication',
};

export const ALL_SKILLS = Object.keys(SKILL_LABELS) as SkillArea[];

export function blockMeta(block: Block): { label: string; icon: IconName; tone: string } {
  return kindMeta(block.kind, block.kind === 'lab' ? (block as LabBlock).track : undefined);
}

export function kindMeta(kind: BlockKind, track?: 'agentic' | 'build'): { label: string; icon: IconName; tone: string } {
  switch (kind) {
    case 'lesson':
      return { label: 'Lesson', icon: 'book', tone: 'lesson' };
    case 'quiz':
      return { label: 'Quiz', icon: 'quiz', tone: 'quiz' };
    case 'exercise':
      return { label: 'Exercises', icon: 'code', tone: 'exercise' };
    case 'lab':
      return track === 'agentic' ? { label: 'Claude Code lab', icon: 'bot', tone: 'agentic' } : { label: 'Build lab', icon: 'flask', tone: 'build' };
    case 'drill':
      return { label: 'Speak-aloud drill', icon: 'mic', tone: 'drill' };
    case 'review':
      return { label: 'Review', icon: 'cards', tone: 'review' };
  }
}

export const RUNTIME_LABELS: Record<ExerciseRuntime, string> = {
  logic: 'TypeScript',
  dom: 'React / DOM',
  types: 'Type challenge',
};

export function weekOf(day: number): number {
  return day <= 7 ? 1 : 2;
}
