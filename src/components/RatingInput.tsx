const LABELS = ['', 'Shaky', 'Basic', 'OK', 'Solid', 'Could teach it'];

export function RatingInput({ value, onChange, label }: { value?: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="rating" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={`rating-btn ${value !== undefined && n <= value ? 'on' : ''}`}
          title={LABELS[n]}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <span className="rating-text">{value ? LABELS[value] : 'Not rated'}</span>
    </div>
  );
}
