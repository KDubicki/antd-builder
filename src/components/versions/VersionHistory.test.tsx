import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import { resetWarned } from 'antd/es/_util/warning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { VersionHistory } from './VersionHistory';
import { ROOT_ID, createRoot } from '@/lib/tree';

let warnings: string[] = [];
beforeEach(() => {
  warnings = [];
  resetWarned();
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
  useEditorStore.setState({ root: createRoot(), versions: [], past: [], future: [] });
});
afterEach(() => vi.restoreAllMocks());

const open = () => {
  render(
    <App>
      <VersionHistory />
    </App>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Version history' }));
  return screen.getByRole('dialog', { name: 'Version history' });
};

describe('VersionHistory', () => {
  it('saves named and default-named versions', () => {
    const panel = open();
    expect(within(panel).getByText('No versions yet')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Save version' }));
    fireEvent.change(within(panel).getByLabelText('Version name'), {
      target: { value: 'Launch' },
    });
    fireEvent.keyDown(within(panel).getByLabelText('Version name'), { key: 'Enter' });

    const items = within(within(panel).getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual([
      'Launch',
      'Version 1',
    ]);
    expect(within(panel).getByLabelText('Version name')).toHaveValue('');
    expect(warnings).toEqual([]);
  });

  it('restores after confirming', async () => {
    act(() => {
      useEditorStore.getState().saveVersion('Empty page');
      useEditorStore.getState().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    });
    const panel = open();
    fireEvent.click(within(panel).getByRole('button', { name: 'Restore Empty page' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(useEditorStore.getState().root.children).toEqual([]));
    expect(await screen.findByText('Restored "Empty page"')).toBeInTheDocument();
  });

  it('deletes after confirming', async () => {
    act(() => {
      useEditorStore.getState().saveVersion('Old');
    });
    const panel = open();
    fireEvent.click(within(panel).getByRole('button', { name: 'Delete Old' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(useEditorStore.getState().versions).toEqual([]));
  });
});
