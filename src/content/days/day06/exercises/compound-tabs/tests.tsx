import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Tab, TabList, TabPanel, Tabs, type TabsProps } from './solution';

function Settings(props: Omit<TabsProps, 'children'>) {
  return (
    <Tabs {...props}>
      <TabList aria-label="Settings">
        <Tab value="account">Account</Tab>
        <Tab value="billing">Billing</Tab>
        <Tab value="team">Team</Tab>
      </TabList>
      <TabPanel value="account">Account panel</TabPanel>
      <TabPanel value="billing">Billing panel</TabPanel>
      <TabPanel value="team">Team panel</TabPanel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });
const expectSelected = (name: string) => {
  expect(tab(name)).toHaveAttribute('aria-selected', 'true');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(screen.getByRole('tabpanel', { name })).toHaveTextContent(`${name} panel`);
};

describe('compound Tabs', () => {
  beforeEach(() => {
    vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
  });

  it('renders a labelled tablist with tabs, and only the defaultValue panel is visible', () => {
    render(<Settings defaultValue="billing" />);
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(tab('Account')).toHaveAttribute('aria-selected', 'false');
    expectSelected('Billing');
  });

  it('wires ARIA: tab aria-controls → panel id, panel aria-labelledby → tab id', () => {
    render(<Settings defaultValue="account" />);
    const panel = screen.getByRole('tabpanel');
    expect(tab('Account').getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab('Account').id);
    expect(panel.id).not.toBe('');
  });

  it('clicking a tab selects it and shows its panel (uncontrolled), reporting via onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Settings defaultValue="account" onValueChange={onValueChange} />);
    await user.click(tab('Team'));
    expectSelected('Team');
    expect(onValueChange).toHaveBeenCalledWith('team');
  });

  it('uses a roving tabindex: Tab key focuses the selected tab, not the first one', async () => {
    const user = userEvent.setup();
    render(<Settings defaultValue="billing" />);
    expect(tab('Billing')).toHaveAttribute('tabindex', '0');
    expect(tab('Account')).toHaveAttribute('tabindex', '-1');
    await user.tab();
    expect(tab('Billing')).toHaveFocus();
  });

  it('ArrowRight / ArrowLeft move selection and focus, wrapping at the ends', async () => {
    const user = userEvent.setup();
    render(<Settings defaultValue="account" />);
    await user.click(tab('Account'));
    await user.keyboard('{ArrowRight}');
    expectSelected('Billing');
    expect(tab('Billing')).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}'); // Team → wraps to Account
    expectSelected('Account');
    await user.keyboard('{ArrowLeft}'); // wraps to the last tab
    expectSelected('Team');
    expect(tab('Team')).toHaveFocus();
  });

  it('Home and End jump to the first and last tab', async () => {
    const user = userEvent.setup();
    render(<Settings defaultValue="billing" />);
    await user.click(tab('Billing'));
    await user.keyboard('{End}');
    expectSelected('Team');
    await user.keyboard('{Home}');
    expectSelected('Account');
    expect(tab('Account')).toHaveFocus();
  });

  it('controlled: reports the change but keeps showing `value` until the parent updates it', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Settings value="account" onValueChange={onValueChange} />);
    await user.click(tab('Billing'));
    expect(onValueChange).toHaveBeenCalledWith('billing');
    expectSelected('Account');
    rerender(<Settings value="billing" onValueChange={onValueChange} />);
    expectSelected('Billing');
  });

  it('Tab outside <Tabs> throws a helpful error', () => {
    expect(() => render(<Tab value="orphan">Orphan</Tab>)).toThrow(/Tabs/);
  });
});
