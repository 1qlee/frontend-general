Implement `useControllableState({ value, defaultValue, onChange })` → `[current, setValue]` — the hook behind every component that supports **both** controlled and uncontrolled use (Radix, Chakra and React Aria all ship one).

```tsx
function Switch({ checked, defaultChecked = false, onCheckedChange }: SwitchProps) {
  const [on, setOn] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange });
  return <button role="switch" aria-checked={on} onClick={() => setOn((v) => !v)} />;
}

<Switch defaultChecked />                        // uncontrolled
<Switch checked={on} onCheckedChange={setOn} />  // controlled
```

**Requirements**

1. **Uncontrolled** when `value === undefined`: internal state starts at `defaultValue` (read on mount only); the setter updates it and calls `onChange`.
2. **Controlled** otherwise — and `null` counts as controlled: return `value`; the setter only calls `onChange`. What's displayed changes when the parent passes a new `value`.
3. The setter accepts a value **or an updater** `(prev) => next`, resolved against the current value. Two updaters called in the same event must both apply (like `useState`).
4. Don't call `onChange` when the next value is `Object.is`-equal to the current one.
5. The setter keeps the **same identity** for the component's lifetime, so callers can put it in dependency arrays or pass it to memoised children — and it must still see the latest `value` and `onChange`.

The tests use `renderHook` from Testing Library: `result.current` is whatever your hook returned on the latest render.

**What the interviewer is looking for:** the `undefined` check (not `??`), "report, don't update" in controlled mode, and how you get a setter that is stable *and* never stale — a ref updated after commit, not a `useCallback` with a long dependency list.
