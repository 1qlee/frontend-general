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
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pressed}
      onClick={() => {
        const next = !pressed;
        setPressed(next);
        onPressedChange?.(next);
      }}
    >
      <span aria-hidden="true">{icon}</span>
    </div>
  );
}

export default function ToggleButtonDemo() {
  return <ToggleButton label="Mute" icon="🔇" />;
}
