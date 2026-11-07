import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Disclosure } from './solution';

const QUESTION = 'What is your refund policy?';
const ANSWER = 'Full refunds within 30 days.';

function renderFaq(defaultOpen?: boolean) {
  render(
    <Disclosure summary={QUESTION} defaultOpen={defaultOpen}>
      <p>{ANSWER}</p>
    </Disclosure>,
  );
  return screen.getByRole('button', { name: QUESTION });
}

/** The panel content is either not rendered or hidden. */
function expectCollapsedContent() {
  const content = screen.queryByText(ANSWER);
  if (content) expect(content).not.toBeVisible();
}

describe('Disclosure', () => {
  it('renders a button whose accessible name is exactly the summary (the ▸ icon is decorative)', () => {
    const button = renderFaq();
    expect(button).toHaveAccessibleName(QUESTION);
  });

  it('starts collapsed: aria-expanded="false" and the content is not visible', () => {
    const button = renderFaq();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expectCollapsedContent();
  });

  it('expands on click and aria-controls points at the panel that holds the content', async () => {
    const user = userEvent.setup();
    const button = renderFaq();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(ANSWER)).toBeVisible();
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).not.toBeNull();
    expect(panel!).toContainElement(screen.getByText(ANSWER));
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    const button = renderFaq();
    await user.click(button);
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expectCollapsedContent();
  });

  it('is reachable with Tab and toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    const button = renderFaq();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('respects defaultOpen', () => {
    const button = renderFaq(true);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(ANSWER)).toBeVisible();
  });

  it('gives each instance its own panel id', () => {
    render(
      <>
        <Disclosure summary="First">
          <p>One</p>
        </Disclosure>
        <Disclosure summary="Second">
          <p>Two</p>
        </Disclosure>
      </>,
    );
    const first = screen.getByRole('button', { name: 'First' }).getAttribute('aria-controls');
    const second = screen.getByRole('button', { name: 'Second' }).getAttribute('aria-controls');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });
});
