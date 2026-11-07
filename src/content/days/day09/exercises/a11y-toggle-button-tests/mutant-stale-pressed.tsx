import { useState, type ReactNode } from 'react';

export interface ToggleButtonProps {
  label: string;
  icon: ReactNode;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export function ToggleButton({ label, icon, defaultPressed = false, onPressedChange }: ToggleButtonProps) {
  const [pressed, setPressed] = useState(defaultPressed);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={defaultPressed}
      className={pressed ? 'is-pressed' : undefined}
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
  return <ToggleButton label="Mute" icon="🔇" />;
}
