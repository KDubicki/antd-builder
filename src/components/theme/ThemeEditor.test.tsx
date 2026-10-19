import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createTheme } from '@/lib/theme';
import { ThemeEditor } from './ThemeEditor';

const themeState = () => useEditorStore.getState().theme;

beforeEach(() => useEditorStore.setState({ theme: createTheme(), past: [], future: [] }));

describe('ThemeEditor', () => {
  it('switches between light and dark mode', () => {
    render(<ThemeEditor />);
    fireEvent.click(screen.getByText('Dark'));
    expect(themeState().mode).toBe('dark');
    fireEvent.click(screen.getByText('Light'));
    expect(themeState().mode).toBe('light');
  });

  it('toggles the compact algorithm', () => {
    render(<ThemeEditor />);
    fireEvent.click(screen.getByLabelText('Compact'));
    expect(themeState().compact).toBe(true);
  });

  it('overrides numeric tokens and clears them back to the default', () => {
    render(<ThemeEditor />);
    const radius = screen.getByLabelText('Border radius');
    expect(radius).toHaveAttribute('placeholder', '6');
    fireEvent.change(radius, { target: { value: '12' } });
    expect(themeState().token.borderRadius).toBe(12);
    fireEvent.change(radius, { target: { value: '' } });
    expect(themeState().token).not.toHaveProperty('borderRadius');
  });

  it('shows antd defaults and overrides for color tokens', () => {
    useEditorStore.setState({ theme: { ...createTheme(), token: { colorPrimary: '#722ed1' } } });
    render(<ThemeEditor />);
    expect(screen.getByText('#722ED1')).toBeInTheDocument();
    expect(screen.getByText('#52C41A')).toBeInTheDocument();
  });

  it('resets the theme', () => {
    useEditorStore.setState({ theme: { mode: 'dark', compact: true, token: { fontSize: 16 } } });
    render(<ThemeEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset theme' }));
    expect(themeState()).toEqual(createTheme());
  });

  it('applies presets and shows which one is active', () => {
    render(<ThemeEditor />);
    const presets = screen.getByRole('group', { name: 'Theme presets' });
    const pressed = () =>
      within(presets)
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
        .map((button) => button.textContent);
    expect(pressed()).toEqual(['antd default']);

    fireEvent.click(within(presets).getByRole('button', { name: /Midnight/ }));
    expect(themeState()).toMatchObject({ mode: 'dark', token: { colorPrimary: '#4c6ef5' } });
    expect(pressed()).toEqual(['Midnight']);
    expect(useEditorStore.getState().past.at(-1)?.label).toBe('Apply Midnight theme');

    // Fine-tuning leaves the preset behind.
    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '16' } });
    expect(pressed()).toEqual([]);
  });
});
