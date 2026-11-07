Build an accessible, compound **Tabs** component: `Tabs`, `TabList`, `Tab`, `TabPanel`. This is the canonical "design a reusable component" interview question — narrate your API decisions as you go.

```tsx
<Tabs defaultValue="account" onValueChange={(v) => console.log(v)}>
  <TabList aria-label="Settings">
    <Tab value="account">Account</Tab>
    <Tab value="billing">Billing</Tab>
  </TabList>
  <TabPanel value="account">…</TabPanel>
  <TabPanel value="billing">…</TabPanel>
</Tabs>
```

**Requirements**

1. **State:** uncontrolled with `defaultValue`; controlled with `value` + `onValueChange` — report the change and keep showing `value` until the parent passes a new one. `onValueChange` is called in both modes.
2. **Context:** `TabList`, `Tab` and `TabPanel` throw an error mentioning `Tabs` when rendered outside it.
3. **ARIA** (WAI-ARIA APG Tabs pattern):
   - `TabList`: `role="tablist"`, forwarding its other props (e.g. `aria-label`).
   - `Tab`: a `<button role="tab">` with an `id`, `aria-selected` and `aria-controls` → its panel.
   - `TabPanel`: `role="tabpanel"` with an `id` and `aria-labelledby` → its tab. Only the selected panel is visible.
4. **Roving tabindex:** the selected tab has `tabIndex={0}`, the others `-1`, so the Tab key lands on the selected tab.
5. **Keyboard:** `ArrowRight` / `ArrowLeft` move selection **and focus** to the next/previous tab, wrapping around; `Home` / `End` go to the first/last tab.

**What the interviewer is looking for:** a compound API with context, controlled + uncontrolled support, explicit `value`s instead of indices, ids from `useId`, the roving tabindex, and a keyboard handler that doesn't depend on how tabs are nested.
