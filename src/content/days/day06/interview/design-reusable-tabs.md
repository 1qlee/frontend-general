**One-liner:** compound components — `Tabs`, `TabList`, `Tab`, `TabPanel` — sharing state through context, supporting controlled and uncontrolled use, with ARIA and keyboard behaviour built in.

**Sketch the API first:**

```tsx
<Tabs defaultValue="account" /* or value + onValueChange */>
  <TabList aria-label="Settings">
    <Tab value="account">Account</Tab>
    <Tab value="billing">Billing <Badge>2</Badge></Tab>
  </TabList>
  <TabPanel value="account">…</TabPanel>
  <TabPanel value="billing">…</TabPanel>
</Tabs>
```

**Why this shape:** a `tabs={[{ label, content }]}` prop works for a demo but grows a prop for every requirement — icons, badges, lazy content, custom layouts. Compound components let consumers compose anything while the root owns the state.

**Key decisions:**
1. **State:** `value` / `defaultValue` / `onValueChange` through a `useControllableState` hook — controlled to sync with the URL, uncontrolled for the simple case.
2. **Identity:** explicit `value` props, not indices injected with `cloneElement` — robust to wrappers and conditionally rendered tabs.
3. **Context:** a memoised `{ selected, select, baseId }`, read through a hook that throws outside `<Tabs>`.
4. **Accessibility (WAI-ARIA APG):** `tablist`/`tab`/`tabpanel` roles, `aria-selected`, `aria-controls` / `aria-labelledby` with ids from `useId`, a roving `tabIndex`, Left/Right/Home/End. Automatic activation by default; manual activation if panels are expensive.
5. **Panels:** hidden vs unmounted (keeps state vs saves work), maybe a `forceMount` option.
6. **Escape hatches:** spread rest props and `className` on every part; `ref` as a prop.

**Testing:** role-based queries, `user-event` keyboard interaction, both modes. **Extension:** for teams that need custom markup, expose the same logic as a headless `useTabs()` with prop getters, and make the components a thin layer on top.
