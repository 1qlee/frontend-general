import { useRef, useState } from 'react';
import { getProgress, replaceProgress, resetProgress, type ProgressState } from '../store/progress';
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme';
import { Icon } from '../components/Icon';

export function Settings() {
  const theme = useThemePreference();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontend-interview-gym-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ProgressState;
      if (data.version !== 1 || typeof data.completed !== 'object') throw new Error('Not a progress file');
      replaceProgress(data);
      setMessage('Progress imported.');
    } catch (err) {
      setMessage(`Import failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="page narrow">
      <header className="page-header">
        <h1>Settings</h1>
      </header>
      <section className="card">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} className={theme === t ? 'active' : ''} onClick={() => setThemePreference(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Your progress</h2>
        <p className="muted">
          Progress is stored in this browser only (localStorage). Export it to back it up or move it to another device.
        </p>
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={exportProgress}>
            <Icon name="download" size={16} /> Export progress
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importProgress(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Reset ALL progress? This cannot be undone. Consider exporting first.')) {
                resetProgress();
                setMessage('Progress reset.');
              }
            }}
          >
            Reset progress
          </button>
        </div>
        {message && (
          <p role="status" className="muted">
            {message}
          </p>
        )}
      </section>
      <section className="card">
        <h2>About the runner</h2>
        <ul>
          <li>
            <strong>TypeScript exercises</strong> run in a Web Worker with a Vitest-compatible test runtime (fake timers, mocks). Infinite loops are stopped after 15 s.
          </li>
          <li>
            <strong>React exercises</strong> run in a sandboxed iframe with React 19, Testing Library and user-event against a real DOM.
          </li>
          <li>
            <strong>Type challenges</strong> are checked by the real TypeScript compiler in strict mode (loaded on demand, ~3 MB, cached by your browser).
          </li>
        </ul>
      </section>
    </div>
  );
}
