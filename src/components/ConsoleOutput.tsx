import type { LogEntry } from '../runner/harness';

export function ConsoleOutput({ logs, empty = 'No console output.', label = 'Console output' }: { logs: LogEntry[]; empty?: string; label?: string }) {
  return (
    <div className="console" role="log" aria-label={label}>
      {logs.length === 0 ? (
        <div className="console-empty">{empty}</div>
      ) : (
        logs.map((entry, i) => (
          <div key={i} className={`console-line console-${entry.level}`}>
            <span className="console-gutter" aria-hidden="true">
              {entry.level === 'error' ? '✕' : entry.level === 'warn' ? '!' : '›'}
            </span>
            <span className="console-text">{entry.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
