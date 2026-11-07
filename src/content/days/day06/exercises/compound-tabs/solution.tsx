import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

interface TabsContextValue {
  selected: string;
  select: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>`);
  return ctx;
}

// Values become part of DOM ids, so keep them id-safe (no spaces).
const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`;

export interface TabsProps {
  /** Controlled selected value. Leave undefined for uncontrolled use. */
  value?: string;
  /** Initially selected value when uncontrolled. */
  defaultValue?: string;
  /** Called with the newly selected value (both modes). */
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({ value, defaultValue = '', onValueChange, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;
  const baseId = useId();

  const select = useCallback(
    (next: string) => {
      if (next === selected) return;
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [selected, isControlled, onValueChange],
  );

  // Memoised so consumers only re-render when something they use changes.
  const ctx = useMemo(() => ({ selected, select, baseId }), [selected, select, baseId]);
  return <TabsContext value={ctx}>{children}</TabsContext>;
}

export type TabListProps = ComponentPropsWithoutRef<'div'>;

export function TabList({ children, onKeyDown, ...rest }: TabListProps) {
  const tabs = useTabsContext('TabList');

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e);
    // Read the order from the DOM: works no matter how tabs are wrapped or composed.
    const tabEls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const index = tabEls.indexOf(e.target as HTMLElement);
    if (index === -1) return;

    let nextIndex: number;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabEls.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabEls.length) % tabEls.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabEls.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault(); // Home/End would otherwise scroll the page
    const next = tabEls[nextIndex];
    next.focus();
    const nextValue = next.dataset.value;
    if (nextValue !== undefined) tabs.select(nextValue); // automatic activation
  }

  return (
    <div role="tablist" {...rest} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
}

export function Tab({ value, children }: TabProps) {
  const tabs = useTabsContext('Tab');
  const isSelected = tabs.selected === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(tabs.baseId, value)}
      aria-selected={isSelected}
      aria-controls={panelId(tabs.baseId, value)}
      tabIndex={isSelected ? 0 : -1} // roving tabindex: Tab key lands on the selected tab
      data-value={value}
      onClick={() => tabs.select(value)}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
}

export function TabPanel({ value, children }: TabPanelProps) {
  const tabs = useTabsContext('TabPanel');
  const isSelected = tabs.selected === value;
  // Keep the element (so aria-controls always points at something) but only render
  // the content of the selected panel.
  return (
    <div
      role="tabpanel"
      id={panelId(tabs.baseId, value)}
      aria-labelledby={tabId(tabs.baseId, value)}
      hidden={!isSelected}
      tabIndex={0}
    >
      {isSelected ? children : null}
    </div>
  );
}

// ---- Preview only -----------------------------------------------------------
export default function TabsDemo() {
  const [tab, setTab] = useState('profile');
  return (
    <div style={{ display: 'grid', gap: 24, fontFamily: 'system-ui' }}>
      <Tabs defaultValue="account">
        <TabList aria-label="Settings (uncontrolled)">
          <Tab value="account">Account</Tab>
          <Tab value="billing">Billing</Tab>
          <Tab value="team">Team</Tab>
        </TabList>
        <TabPanel value="account">Account settings — try ←/→, Home and End.</TabPanel>
        <TabPanel value="billing">Invoices and payment methods.</TabPanel>
        <TabPanel value="team">Invite your colleagues.</TabPanel>
      </Tabs>

      <div>
        <p>
          Controlled — parent state: <code>{tab}</code>{' '}
          <button type="button" onClick={() => setTab('security')}>
            Jump to Security
          </button>
        </p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Profile (controlled)">
            <Tab value="profile">Profile</Tab>
            <Tab value="security">Security</Tab>
          </TabList>
          <TabPanel value="profile">Your public profile.</TabPanel>
          <TabPanel value="security">Passwords and 2FA.</TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
