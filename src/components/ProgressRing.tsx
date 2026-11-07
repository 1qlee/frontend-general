import type { ReactNode } from 'react';

export function ProgressRing({ value, size = 28, stroke = 3, label, children }: { value: number; size?: number; stroke?: number; label?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span className={`ring ${clamped >= 1 ? 'ring-done' : ''}`} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="ring-value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children !== undefined && <span className="ring-label">{children}</span>}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
