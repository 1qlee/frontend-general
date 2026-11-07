import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Combobox } from './solution';

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Mango', 'Orange'];

function setup() {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<Combobox label="Fruit" options={FRUITS} onSelect={onSelect} />);
  const input = screen.getByRole('combobox', { name: 'Fruit' });
  return { user, onSelect, input };
}

/** The element the combobox currently points at with aria-activedescendant (or null). */
function activeOption(input: HTMLElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
}

const optionNames = () => screen.queryAllByRole('option').map((o) => o.textContent);

describe('Combobox', () => {
  it('is a labelled, collapsed combobox with list autocomplete', () => {
    const { input } = setup();
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('typing filters case-insensitively ("contains") and expands the listbox it controls', async () => {
    const { user, input } = setup();
    await user.type(input, 'AN');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(optionNames()).toEqual(['Banana', 'Mango', 'Orange']);
    const listbox = document.getElementById(input.getAttribute('aria-controls') ?? '');
    expect(listbox).not.toBeNull();
    expect(listbox!).toHaveAttribute('role', 'listbox');
    expect(listbox!).toContainElement(screen.getByRole('option', { name: 'Mango' }));
  });

  it('ArrowDown moves aria-activedescendant through the options while focus stays in the input', async () => {
    const { user, input } = setup();
    await user.type(input, 'an');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Banana');
    expect(activeOption(input)).toHaveAttribute('role', 'option');
    expect(activeOption(input)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Mango');
    expect(screen.getByRole('option', { name: 'Banana' })).not.toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveFocus();
  });

  it('ArrowUp/ArrowDown wrap around the ends', async () => {
    const { user, input } = setup();
    await user.type(input, 'an');
    await user.keyboard('{ArrowUp}');
    expect(activeOption(input)).toHaveTextContent('Orange');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toHaveTextContent('Banana');
    await user.keyboard('{ArrowUp}');
    expect(activeOption(input)).toHaveTextContent('Orange');
  });

  it('ArrowDown on a closed, empty combobox opens every option and activates the first', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(optionNames()).toEqual(FRUITS);
    expect(activeOption(input)).toHaveTextContent('Apple');
  });

  it('Enter selects the active option, collapses, and calls onSelect', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'an');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input).toHaveValue('Mango');
    expect(onSelect).toHaveBeenCalledWith('Mango');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('Escape collapses without changing what was typed', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'an');
    await user.keyboard('{ArrowDown}{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('an');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('typing again resets the active option', async () => {
    const { user, input } = setup();
    await user.type(input, 'a');
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).not.toBeNull();
    await user.type(input, 'n');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('clicking an option selects it', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'ch');
    await user.click(screen.getByRole('option', { name: 'Cherry' }));
    expect(input).toHaveValue('Cherry');
    expect(onSelect).toHaveBeenCalledWith('Cherry');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays collapsed when nothing matches', async () => {
    const { user, input } = setup();
    await user.type(input, 'xyz');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
