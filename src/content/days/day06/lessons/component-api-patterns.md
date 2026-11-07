## Why interviewers ask about component APIs

"Build a reusable Tabs / Modal / Select" is the most common senior React prompt. The interviewer cares far less about the CSS than about whether you can design an API **another team can use without reading your source**: flexible where it needs to be, hard to misuse, accessible by default, and controllable from outside when needed. Expect follow-ups like *"Why compound components and not a `tabs={[…]}` prop?"*, *"How would a parent open it programmatically?"*, *"What if a team needs completely different markup?"*

You need named patterns, the trade-offs between them, and a short script for choosing. That's this lesson. (Typing props, `children` and generic components was Day 4 — here we focus on the *shape* of the API.)

## Composition first: `children` and slots

The default failure mode of a reusable component is **configuration creep** — one prop per design request:

```tsx
<Card
  title="Pro plan"
  subtitle="Most popular"
  icon={<Star />}
  footerText="Billed yearly"
  footerAlign="right"
  showDivider
  titleSize="lg"
/>
```

Every new requirement adds a prop, a branch and a test. **Composition** hands structure back to the caller:

```tsx
<Card>
  <CardHeader icon={<Star />}>
    Pro plan <Badge>Most popular</Badge>
  </CardHeader>
  <CardBody>…</CardBody>
  <CardFooter align="right">Billed yearly</CardFooter>
</Card>
```

When a layout has several "holes", use **slots** — props that accept `ReactNode`:

```tsx
interface PageLayoutProps {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode; // the main slot
}

function PageLayout({ header, sidebar, children }: PageLayoutProps) {
  return (
    <div className="page">
      <header>{header}</header>
      {sidebar && <aside>{sidebar}</aside>}
      <main>{children}</main>
    </div>
  );
}

<PageLayout header={<TopNav />} sidebar={<Filters />}>
  <Results />
</PageLayout>;
```

Composition is also a quiet performance tool: elements passed as `children` are created by the *parent*, so when the wrapper's own state changes React sees the same element objects and can skip re-rendering them. Day 7 goes deeper.

## Compound components

**Compound components** are a set of components that work together and share **implicit state through context**, while the consumer controls structure and markup. The native analogy is `<select>` and `<option>`: you choose which options exist and in what order; the select owns which one is selected.

```tsx
<Tabs defaultValue="account">
  <TabList aria-label="Settings">
    <Tab value="account">Account</Tab>
    <Tab value="billing">
      Billing <Badge>2</Badge>
    </Tab>
  </TabList>
  <TabPanel value="account"><AccountForm /></TabPanel>
  <TabPanel value="billing"><Invoices /></TabPanel>
</Tabs>
```

The skeleton:

```tsx
interface TabsContextValue {
  selected: string;
  select: (value: string) => void;
  baseId: string; // from useId, for aria-controls / aria-labelledby
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>`);
  return ctx;
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [selected, setSelected] = useState(defaultValue);
  const baseId = useId();
  const ctx = useMemo(() => ({ selected, select: setSelected, baseId }), [selected, baseId]);
  return <TabsContext value={ctx}>{children}</TabsContext>; // React 19: the context is its own provider
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const tabs = useTabsContext('Tab');
  const isSelected = tabs.selected === value;
  return (
    <button type="button" role="tab" aria-selected={isSelected} tabIndex={isSelected ? 0 : -1} onClick={() => tabs.select(value)}>
      {children}
    </button>
  );
}
```

### The design decisions interviewers probe

1. **`null` default + a throwing hook.** Using a compound piece outside its parent fails loudly with a useful message, and the hook's return type is non-nullable for every consumer.
2. **How does a `Tab` know who it is?**
   - **Explicit `value` props** (recommended): robust to wrapping, reordering, conditional rendering and lazy panels; values are meaningful (`'billing'`) and serialisable to a URL.
   - **Implicit index via `React.Children.map` + `cloneElement`**: looks magical in a demo, but breaks the moment a tab is wrapped in a fragment, a `<Tooltip>`, or a custom `<PermissionGate>` — the parent only sees its *direct* children. The React docs list `Children` and `cloneElement` as "uncommon and can lead to fragile code".
   - **Descendant registration** (Radix-style collections): children register themselves in effects so order comes from the DOM. Powerful but complex — mention it, don't build it in 30 minutes.
3. **Dot notation (`Tabs.List`) vs named exports.** Dot notation reads nicely but defeats tree-shaking and **doesn't work across the Server Component boundary** — a Server Component can't "dot into" a client module (`<Tabs.List>` throws). Radix exports separate names and recommends a namespace import (`import * as Tabs from '@radix-ui/react-tabs'` → `<Tabs.Root>`), which gives the same syntax with real exports.
4. **Memoise the context value** so consumers don't re-render every time the parent does (lesson 3).
5. **Accessibility is part of the API**: roles, `aria-selected`, `aria-controls`, roving `tabIndex` and arrow-key navigation come built in — the consumer can't forget them.

{{quiz:clone-element-fragile}}

> [!INTERVIEW] Compound components in one breath
> "Compound components are a group of components — like Tabs, TabList, Tab and TabPanel — that share implicit state through a context owned by the root, while the consumer decides the markup and order. It avoids prop explosion and lets people put anything inside a tab. I give each child an explicit value instead of relying on its index, throw a clear error if a child is used outside the root, memoise the context value, and bake the ARIA and keyboard behaviour in."

## Render props

A **render prop** is a function prop (often `children`) that returns UI. The component owns the behaviour; the caller owns the markup:

```tsx
interface PointerPosition {
  x: number;
  y: number;
}

function PointerTracker({ children }: { children: (pos: PointerPosition) => ReactNode }) {
  const [pos, setPos] = useState<PointerPosition>({ x: 0, y: 0 });
  return <div onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>{children(pos)}</div>;
}

<PointerTracker>{({ x, y }) => <p>{x}, {y}</p>}</PointerTracker>;
```

Hooks replaced most render props (`const pos = usePointerPosition(ref)` is simpler and composes better). They're still the right tool when:

- the component must render **your UI at a specific place in its own tree** — `renderItem` in a virtualised list, `renderOption` in a combobox;
- you want to style based on internal state without a hook: React Router's `<NavLink className={({ isActive }) => …}>`, React Aria Components' `className={({ isSelected }) => …}`;
- the consumer is a **class component** (no hooks).

## Higher-order components (HOCs)

A **HOC** is a function that takes a component and returns a new component with extra props or behaviour:

```tsx
interface WithUserProps {
  user: User;
}

export function withUser<P extends WithUserProps>(Wrapped: ComponentType<P>) {
  function WithUser(props: Omit<P, keyof WithUserProps>) {
    const user = useCurrentUser();
    return <Wrapped {...(props as P)} user={user} />;
  }
  WithUser.displayName = `withUser(${Wrapped.displayName ?? Wrapped.name})`;
  return WithUser;
}

const ProfileWithUser = withUser(Profile); // <ProfileWithUser /> — `user` is injected
```

Why hooks replaced them:

- **Indirection:** where did `user` come from? You have to read the wrapper.
- **Prop collisions:** two HOCs that both inject `data` silently overwrite each other.
- **Wrapper hell** in DevTools, and composition order matters (`withA(withB(C))` ≠ `withB(withA(C))`).
- **Refs and statics:** before React 19 refs needed `forwardRef`; static methods had to be hoisted manually.
- **Typing** generic HOCs is awkward (note the `as P` cast above).

Where you still see them: react-redux's `connect`, React Router v5's `withRouter`, MobX's `observer`, `withErrorBoundary`, route/auth guards — and `memo` and `lazy` are HOC-*shaped* APIs. Interviewers still ask you to write one (`withLogger`, `withAuth`) to check you understand components as values.

## Choosing between them

| Need | Reach for |
|---|---|
| Reuse **stateful logic**; the caller renders everything | Custom hook |
| Several components sharing **implicit state**; caller controls structure | Compound components + context |
| The component must render caller UI **at a specific spot in its tree** | Render prop (`renderItem`) |
| Full **markup and styling** control for a design system / library | Headless hook with prop getters |
| Wrap many components uniformly at definition time; legacy code | HOC |

## Controlled vs uncontrolled component APIs

You know this distinction from `<input>`: `value` + `onChange` (**controlled** — React state is the source of truth) vs `defaultValue` (**uncontrolled** — the DOM owns it). The same choice applies to *your* components' state: is the dialog open, which tab is selected, which accordion items are expanded.

- **Uncontrolled:** the component owns the state. The caller passes `defaultX` (initial value only) and may observe changes. Easiest to use.
- **Controlled:** the parent owns the state through `x` + `onXChange`. Needed when the parent must read or override it — sync with the URL, reset after submit, open from a keyboard shortcut, validate before accepting.

Good components support **both**, with a conventional prop trio:

```ts
interface DisclosureProps {
  open?: boolean;                          // controlled
  defaultOpen?: boolean;                   // uncontrolled initial value
  onOpenChange?: (open: boolean) => void;  // called in both modes
  children: ReactNode;
}
```

The rules that make it predictable:

1. **The mode is decided by whether the value prop is `undefined`** — and shouldn't change during the component's lifetime. (`null` is a valid controlled value, e.g. "no selection".) React warns for inputs: *"A component is changing an uncontrolled input to be controlled."*
2. **`defaultX` is read once, on mount.** Changing it later does nothing; to reset, change the component's `key`.
3. **In controlled mode, report and don't update.** Call `onXChange(next)` and keep rendering the prop: the parent may reject or transform the change.
4. **Name callbacks after what changed and pass the value, not the event** — `onValueChange(value)`, `onOpenChange(open)` (Radix's convention). Your state can change for non-DOM reasons (keyboard, a close button, programmatic calls), so there may be no meaningful event.

Centralise the logic in one hook instead of re-implementing it in every component:

```ts
const [open, setOpen] = useControllableState({
  value: props.open,
  defaultValue: props.defaultOpen ?? false,
  onChange: props.onOpenChange,
});
```

You'll implement `useControllableState` in today's exercises, including updater functions and a stable setter.

{{quiz:controlled-mode-switch}}

> [!MISTAKE]
> Copying a prop into state "to make it controllable": `const [open, setOpen] = useState(props.open)`. It only reads the prop on mount, so later prop changes are ignored — now neither the parent nor the component is really in charge.

## Headless components and hooks

**Headless** means *behaviour without presentation*: state, keyboard interaction, focus management and ARIA, with no markup or styles imposed.

| Library | Shape |
|---|---|
| **Radix Primitives** | Unstyled compound components (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`); controlled/uncontrolled props everywhere; `asChild` to merge behaviour into your own element |
| **React Aria** (Adobe) | Hooks (`useButton`, `useComboBox`) that return props to spread, plus a component layer; the most rigorous accessibility and i18n |
| **Downshift** | Hooks for combobox/select returning **prop getters**; popularised the pattern |
| **TanStack** Table / Virtual / Form | Headless logic for complex widgets; you render every cell |
| **shadcn/ui** | Not a dependency: copy-paste styled components built on Radix + Tailwind that you own |

Why teams choose headless: design systems need total control of styling and markup, and the behaviour of menus, comboboxes and dialogs is genuinely hard to get right (focus, ARIA, keyboard, screen-reader quirks — Day 9). Reusing battle-tested behaviour and owning the look is the best of both. The trade-off: more assembly, and consumers can still break accessibility by rendering the wrong elements.

## Prop getters

A headless hook returns **functions that produce props** for the elements the consumer renders, merging the consumer's own props in:

```tsx
type ButtonProps = ComponentPropsWithoutRef<'button'>;
type DivProps = ComponentPropsWithoutRef<'div'>;

function callAll<Args extends unknown[]>(...fns: Array<((...args: Args) => void) | undefined>) {
  return (...args: Args) => fns.forEach((fn) => fn?.(...args));
}

export function useDisclosure(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  function getToggleProps({ onClick, ...rest }: ButtonProps = {}): ButtonProps {
    return {
      type: 'button',
      ...rest,                            // consumer props (className, data-*, …)
      'aria-expanded': open,              // required behaviour wins
      'aria-controls': contentId,
      onClick: callAll(onClick, () => setOpen((o) => !o)), // both handlers run
    };
  }

  function getContentProps(props: DivProps = {}): DivProps {
    return { ...props, id: contentId, hidden: !open };
  }

  return { open, setOpen, getToggleProps, getContentProps };
}

// The consumer owns markup and styles; behaviour and ARIA are guaranteed.
function Faq() {
  const { getToggleProps, getContentProps } = useDisclosure();
  return (
    <>
      <button className="faq-question" {...getToggleProps({ onClick: () => track('faq_opened') })}>
        Do you ship internationally?
      </button>
      <div className="faq-answer" {...getContentProps()}>Yes, to 40+ countries.</div>
    </>
  );
}
```

Why a *getter* rather than returning a plain props object (a "prop collection") to spread? With `<button {...toggleProps} onClick={mine}>` the last `onClick` wins and **silently replaces** the hook's handler — the disclosure stops working. A getter receives the consumer's props and **composes** them: both handlers run, and the hook decides which props are overridable and which are not.

Radix's **`asChild`** solves the same "my element, your behaviour" problem from the component side: `<Dialog.Trigger asChild><MyButton /></Dialog.Trigger>` merges the trigger's props and handlers into your child element.

{{quiz:prop-getter-why}}

## How to choose — and explain it — in an interview

A script for any "build a reusable X" prompt:

1. **Clarify the consumers.** One app or a design system used by many teams? Do they need styling freedom? Will a parent need to control the state?
2. **Start with the simplest API** that covers the stated use cases — props and `children`.
3. **Several pieces sharing state, caller controls layout →** compound components + context.
4. **Total markup control / library →** a headless hook with prop getters, optionally with styled compound components built on top.
5. **Support controlled and uncontrolled** for any state a parent might care about (open, value, selection), through one `useControllableState`.
6. **Accessible by default:** roles, ARIA wiring with `useId`, keyboard support — built in, not documented as homework.
7. **Escape hatches:** spread remaining props and `className` onto the root element, forward a `ref` (a plain prop in React 19).

> [!INTERVIEW] Say it like this
> "For a reusable Tabs I'd use compound components — Tabs, TabList, Tab and TabPanel — sharing state through context, so consumers control markup and can put anything in a tab. It supports controlled use with value and onValueChange and uncontrolled use with defaultValue, through one useControllableState hook. Tabs are identified by an explicit value rather than their index, so wrapping them doesn't break anything, and roles, ids and arrow-key navigation are built in. If a team needed complete control of markup, I'd expose the same logic as a headless useTabs hook with prop getters."

## Key takeaways

- Prefer **composition** (`children`, slots) over configuration props.
- **Compound components** share implicit state via context; identify children by explicit values, not `cloneElement` + index; throw outside the root; memoise the context value.
- **Render props** survive for "render your UI at my spot" (`renderItem`) and state-based styling; **hooks** replaced most of them.
- **HOCs** are legacy-but-common: indirection, prop collisions, wrapper hell; know how to write and type one.
- **Controlled vs uncontrolled:** `value`/`defaultValue`/`onValueChange`; mode decided by `undefined`; defaults read once; controlled mode reports and doesn't update.
- **Headless** = behaviour + ARIA without markup (Radix, React Aria, Downshift); **prop getters** compose consumer props instead of letting them clobber yours.
- In an interview: clarify consumers → simplest API → escalate to compound/headless → controlled + uncontrolled → accessible by default → escape hatches.
