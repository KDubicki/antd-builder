import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_KEY } from '@/components/project/autosave';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { toProject } from '@/lib/project';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { SharedProject, formatDay } from './SharedProject';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const shared = (name = 'Landing') =>
  JSON.stringify(
    toProject({
      name,
      root: { ...createRoot(), children: [createNode('Card', 'card')] },
      theme: createTheme(),
    }),
  );

beforeEach(() =>
  useEditorStore.setState({ root: createRoot(), previewMode: false, viewport: 'desktop' }),
);
afterEach(() => push.mockReset());

describe('SharedProject', () => {
  it('shows the shared page read-only, at a chosen width', async () => {
    render(<SharedProject json={shared()} />);
    expect(screen.getByText('Landing')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    const canvas = await screen.findByTestId('canvas');
    expect(canvas).toHaveAttribute('data-preview', 'true');
    expect(canvas.querySelector('.ant-card')).not.toBeNull();

    fireEvent.click(screen.getByText('Mobile'));
    expect(canvas).toHaveAttribute('data-viewport', 'mobile');
  });

  it('opens in the editor straight away when this browser has no project', async () => {
    render(<SharedProject json={shared()} />);
    await screen.findByTestId('canvas');
    fireEvent.click(screen.getByRole('button', { name: /Open in editor/ }));

    expect(push).toHaveBeenCalledWith('/');
    expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!)).toMatchObject({ name: 'Landing' });
    expect(useEditorStore.getState().previewMode).toBe(false);
  });

  it('asks before replacing the project saved in this browser', async () => {
    localStorage.setItem(AUTOSAVE_KEY, shared('Mine'));
    render(<SharedProject json={shared()} />);
    await screen.findByTestId('canvas');
    fireEvent.click(screen.getByRole('button', { name: /Open in editor/ }));

    expect(await screen.findByText(/"Mine" in this browser's editor/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!)).toMatchObject({ name: 'Landing' });
  });

  it('opens even when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<SharedProject json={shared()} />);
    await screen.findByTestId('canvas');
    act(() => fireEvent.click(screen.getByRole('button', { name: /Open in editor/ })));
    expect(push).toHaveBeenCalledWith('/');
    vi.restoreAllMocks();
  });

  it('says when the link expires', () => {
    render(<SharedProject json={shared()} expiresAt="2026-11-17T12:00:00.000Z" />);
    expect(screen.getByText(/Link expires/)).toBeInTheDocument();
    expect(screen.getByText(formatDay('2026-11-17T12:00:00.000Z'))).toHaveAttribute(
      'datetime',
      '2026-11-17T12:00:00.000Z',
    );
  });

  it('explains a snapshot that no longer opens', () => {
    render(<SharedProject json="{}" />);
    expect(screen.getByText(/can't be opened: Invalid project file/)).toBeInTheDocument();
  });
});
