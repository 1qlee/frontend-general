import { useState, type ReactNode } from 'react';

export interface ToggleButtonProps {
  /** Accessible name. The button is icon-only, so this becomes its aria-label. */
  label: string;
  /** Decorative icon (hidden from assistive tech). */
  icon: ReactNode;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

/** APG Button pattern, toggle variant: a native button with aria-pressed and a STABLE name. */
export function ToggleButton({ label, icon, defaultPressed = false, onPressedChange }: ToggleButtonProps) {
  const [pressed, setPressed] = useState(defaultPressed);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={() => {
        const next = !pressed;
        setPressed(next);
        onPressedChange?.(next);
      }}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export default function ToggleButtonDemo() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <ToggleButton label="Mute" icon="🔇" />
      <ToggleButton label="Bold" icon={<b>B</b>} defaultPressed />
    </div>
  );
}
