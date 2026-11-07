import { useEffect, useRef, useState, type ReactNode } from 'react';
import { days } from '../content';
import { Link, usePath } from '../lib/router';
import { setThemePreference, useTheme } from '../lib/theme';
import { formatDuration, pauseTimer, startTimer, useStudyTimer } from '../lib/studyTimer';
import { dayCompletion, toDateKey, useProgress, currentDayNumber } from '../store/progress';
import { Icon, type IconName } from './Icon';
import { CommandPalette } from './CommandPalette';
import { ProgressRing } from './ProgressRing';

const NAV: { to: string; label: string; icon: IconName; match: RegExp }[] = [
  { to: '/', label: 'Dashboard', icon: 'home', match: /^\/$/ },
  { to: '/start', label: 'Start here', icon: 'compass', match: /^\/start/ },
  { to: '/flashcards', label: 'Flashcards', icon: 'cards', match: /^\/flashcards/ },
  { to: '/practice', label: 'Practice bank', icon: 'code', match: /^\/practice/ },
  { to: '/mock', label: 'Mock interview', icon: 'mic', match: /^\/mock/ },
  { to: '/playbook', label: 'Interview playbook', icon: 'book', match: /^\/playbook/ },
  { to: '/playground', label: 'Playground', icon: 'terminal', match: /^\/playground/ },
  { to: '/settings', label: 'Settings', icon: 'settings', match: /^\/settings/ },
];

function StudyTimer() {
  const timer = useStudyTimer();
  const today = useProgress((s) => s.studyLog[toDateKey(new Date())] ?? 0);
  return (
    <div className="study-timer">
      <button
        type="button"
        className={`btn btn-sm ${timer.running ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => (timer.running ? pauseTimer() : startTimer())}
        aria-pressed={timer.running}
        title={timer.running ? 'Pause study timer' : 'Start study timer'}
      >
        <Icon name={timer.running ? 'pause' : 'clock'} size={14} />
        <span className="study-timer-session">{timer.running || timer.sessionSeconds ? formatDuration(timer.sessionSeconds, true) : 'Study timer'}</span>
      </button>
      <span className="study-timer-today" title="Studied today (goal: 4h)">
        {formatDuration(today)} / 4h today
      </span>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const path = usePath();
  const progress = useProgress();
  const current = currentDayNumber(progress, days);
  const activeDay = /^\/day\/(\d+)/.exec(path)?.[1];

  return (
    <nav className="sidebar" aria-label="Main">
      <Link to="/" className="brand" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden="true">
          FE
        </span>
        <span className="brand-text">
          <strong>Frontend Interview Gym</strong>
          <small>React · TypeScript · Agentic</small>
        </span>
      </Link>
      <ul className="nav-list">
        {NAV.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className={`nav-link ${item.match.test(path) ? 'active' : ''}`} aria-current={item.match.test(path) ? 'page' : undefined} onClick={onNavigate}>
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="nav-section-title">Course · {days.length} days</div>
      <ol className="day-list">
        {days.map((day) => {
          const c = dayCompletion(progress, day);
          const pct = c.minutesTotal ? c.minutesDone / c.minutesTotal : 0;
          const isActive = activeDay === String(day.number);
          return (
            <li key={day.number}>
              <Link
                to={`/day/${day.number}`}
                className={`day-link ${isActive ? 'active' : ''} ${day.number === current ? 'current' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
              >
                <ProgressRing value={pct} size={22} label={`${Math.round(pct * 100)}% complete`}>
                  {day.number}
                </ProgressRing>
                <span className="day-link-title">{day.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const theme = useTheme();
  const path = usePath();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Route change: scroll to top and move focus to main content for screen-reader users.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [path.split('?')[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <a className="skip-link" href="#main" onClick={(e) => (e.preventDefault(), mainRef.current?.focus())}>
        Skip to content
      </a>
      <Sidebar onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className="app-main">
        <header className="topbar">
          <button type="button" className="btn btn-ghost icon-btn menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Icon name="menu" />
          </button>
          <button type="button" className="search-btn" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} />
            <span>Search lessons, exercises…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-right">
            <StudyTimer />
            <button
              type="button"
              className="btn btn-ghost icon-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} className="content">
          {children}
        </main>
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
