import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { ShareButton } from './ShareButton';
import { type MyShare, loadMyShares, addMyShare } from './myShares';

const fetchMock = vi.fn<typeof fetch>();
const writeText = vi.fn<(text: string) => Promise<void>>();
const origin = () => window.location.origin;

beforeEach(() => {
  useEditorStore.setState({
    name: 'Shop',
    root: { ...createRoot(), children: [createNode('Button', 'btn')] },
    theme: createTheme(),
    versions: [
      {
        id: 'v',
        name: 'Private draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        root: createRoot(),
        theme: createTheme(),
        mockData: [],
        customBlocks: [],
      },
    ],
  });
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  writeText.mockReset();
});

const renderShare = () =>
  render(
    <App>
      <ShareButton />
    </App>,
  );

const respond = (status: number, body?: unknown) =>
  fetchMock.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: /Share/ }));
  return screen.getByRole('dialog', { name: 'Share a read-only copy' });
};

const existing: MyShare = {
  id: 'old',
  deleteToken: 'tok',
  name: 'Earlier shop',
  createdAt: '2026-10-01T09:00:00.000Z',
};

describe('ShareButton', () => {
  it('creates a link without the versions, shows it and remembers it', async () => {
    respond(201, { id: 'abc', deleteToken: 'secret', expiresAt: '2099-01-02T00:00:00.000Z' });
    renderShare();
    const dialog = openDialog();
    expect(within(dialog).getByText('No links yet')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled(); // opening the dialog creates nothing

    fireEvent.click(within(dialog).getByRole('button', { name: /Create link/ }));
    const link = await within(dialog).findByLabelText('Share link');
    expect(link).toHaveValue(`${origin()}/s/abc`);
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/shares');
    const sent = JSON.parse(init?.body as string) as { name: string; versions: unknown[] };
    expect(sent).toMatchObject({ name: 'Shop', versions: [] });

    expect(loadMyShares()).toEqual([
      expect.objectContaining({
        id: 'abc',
        deleteToken: 'secret',
        name: 'Shop',
        expiresAt: '2099-01-02T00:00:00.000Z',
      }),
    ]);
    const list = within(dialog).getByRole('list', { name: 'Your shared links' });
    expect(within(list).getByText('Shop')).toBeInTheDocument();
    expect(within(list).getByText(/expires/)).toBeInTheDocument();

    writeText.mockResolvedValue();
    fireEvent.click(within(dialog).getByRole('button', { name: /^copy Copy link$/ }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${origin()}/s/abc`);
  });

  it('lists earlier links to copy, open or delete', async () => {
    addMyShare(existing);
    renderShare();
    const item = within(openDialog()).getByRole('listitem');
    expect(within(item).getByText('Earlier shop')).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/s/old');

    writeText.mockResolvedValue();
    fireEvent.click(within(item).getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${origin()}/s/old`));

    respond(204);
    fireEvent.click(within(item).getByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Link deleted')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/shares/old', {
      method: 'DELETE',
      headers: { authorization: 'Bearer tok' },
    });
    expect(loadMyShares()).toEqual([]);
    expect(screen.getByText('No links yet')).toBeInTheDocument();
  });

  it('marks expired links', () => {
    addMyShare({ ...existing, expiresAt: '2020-01-01T00:00:00.000Z' });
    renderShare();
    const item = within(openDialog()).getByRole('listitem');
    expect(within(item).getByText('Expired')).toBeInTheDocument();
    expect(within(item).queryByText(/expires/)).not.toBeInTheDocument();
  });

  const deleteExisting = async () => {
    addMyShare(existing);
    renderShare();
    const item = within(openDialog()).getByRole('listitem');
    fireEvent.click(within(item).getByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  };

  it('keeps a link whose deletion failed', async () => {
    respond(500, { error: 'Disk on fire' });
    await deleteExisting();
    expect(await screen.findByText('Disk on fire')).toBeInTheDocument();
    expect(loadMyShares()).toHaveLength(1);
  });

  it('forgets a link already gone from the server', async () => {
    respond(404, { error: 'Shared project not found' });
    await deleteExisting();
    await waitFor(() => expect(loadMyShares()).toEqual([]));
  });

  it('explains when copying is blocked', async () => {
    respond(201, { id: 'abc', deleteToken: 't' });
    writeText.mockRejectedValue(new Error('denied'));
    renderShare();
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /Create link/ }));
    await within(dialog).findByLabelText('Share link');
    fireEvent.click(within(dialog).getByRole('button', { name: /^copy Copy link$/ }));
    expect(await screen.findByText(/Copying is not allowed here/)).toBeInTheDocument();
  });

  it('shows why creating a link failed', async () => {
    respond(413, { error: 'The project is larger than 2 MB' });
    renderShare();
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /Create link/ }));
    expect(await screen.findByText('The project is larger than 2 MB')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Share link')).not.toBeInTheDocument();
    expect(loadMyShares()).toEqual([]);
  });
});
