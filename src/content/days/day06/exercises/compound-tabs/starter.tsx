import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';

// TODO: create a context for { selected, select, baseId } with a `null` default,
// plus a `useTabsContext(componentName)` hook that throws a helpful error outside <Tabs>.

export interface TabsProps {
  /** Controlled selected value. Leave undefined for uncontrolled use. */
  value?: string;
  /** Initially selected value when uncontrolled. */
  defaultValue?: string;
  /** Called with the newly selected value (both modes). */
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

/** TODO: own (or receive) the selected value, create a base id with useId, provide the context. */
export function Tabs({ children }: TabsProps) {
  return <>{children}</>;
}

export type TabListProps = ComponentPropsWithoutRef<'div'>;

/** TODO: role="tablist"; ArrowLeft/ArrowRight (wrapping), Home and End move selection AND focus. */
export function TabList({ children, ...rest }: TabListProps) {
  return <div {...rest}>{children}</div>;
}

export interface TabProps {
  value: string;
  children: ReactNode;
}

/** TODO: role="tab", id, aria-selected, aria-controls, roving tabIndex (0 selected / -1 others), click selects. */
export function Tab({ children }: TabProps) {
  return <button type="button">{children}</button>;
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
}

/** TODO: role="tabpanel", id, aria-labelledby → its tab; only the selected panel is visible. */
export function TabPanel({ children }: TabPanelProps) {
  return <div>{children}</div>;
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
