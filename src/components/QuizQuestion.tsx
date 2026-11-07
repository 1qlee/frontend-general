import { useState } from 'react';
import type { QuizQuestion as Question } from '../content/types';
import { answerQuiz, clearQuiz, key, useProgress } from '../store/progress';
import { Markdown } from './Markdown';
import { CodeBlock } from './CodeBlock';
import { RunnableCode } from './RunnableCode';
import { Icon } from './Icon';

interface Props {
  question: Question;
  day: number;
  index?: number;
  total?: number;
}

export function QuizQuestion({ question, day, index, total }: Props) {
  const saved = useProgress((s) => s.quiz[key(day, question.id)]);
  const [showRun, setShowRun] = useState(false);
  const answered = saved !== undefined;
  const letters = 'ABCDEF';

  return (
    <div className={`quiz-card ${answered ? (saved.correct ? 'is-correct' : 'is-wrong') : ''}`}>
      <div className="quiz-head">
        <span className="quiz-tag">
          <Icon name="quiz" size={14} /> {index !== undefined && total ? `Question ${index + 1} of ${total}` : 'Check yourself'}
        </span>
        {answered && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => clearQuiz(day, [question.id])}>
            <Icon name="rotate" size={14} /> Retry
          </button>
        )}
      </div>
      <div className="quiz-prompt">
        <Markdown source={question.prompt} />
      </div>
      {question.code && (showRun ? <RunnableCode code={question.code} compact /> : <CodeBlock code={question.code} lang={question.codeLang ?? 'ts'} />)}
      <div className="quiz-choices" role="radiogroup" aria-label="Answer choices">
        {question.choices.map((choice, i) => {
          const isAnswer = i === question.answer;
          const isPicked = saved?.choice === i;
          const state = answered ? (isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim') : '';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              className={`quiz-choice ${state}`}
              disabled={answered}
              onClick={() => answerQuiz(day, question.id, i, isAnswer)}
            >
              <span className="quiz-letter" aria-hidden="true">
                {answered && isAnswer ? <Icon name="check" size={14} /> : answered && isPicked ? <Icon name="x" size={14} /> : letters[i]}
              </span>
              <span className="quiz-choice-text">
                <Markdown source={choice} inline />
              </span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="quiz-explanation" aria-live="polite">
          <strong>{saved.correct ? 'Correct.' : 'Not quite.'}</strong>
          <Markdown source={question.explanation} />
          {question.code && question.runnable && !showRun && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRun(true)}>
              <Icon name="play" size={14} /> Run it and see
            </button>
          )}
        </div>
      )}
    </div>
  );
}
