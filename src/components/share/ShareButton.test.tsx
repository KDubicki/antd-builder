import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { ShareButton } from './ShareButton';

const fetchMock = vi.fn<typeof fetch>();
const writeText = vi.fn<(text: string) => Promise<void>>();

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

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('ShareButton', () => {
  it('uploads the project without its versions and shows the link', async () => {
    respond(201, { id: 'abc' });
    renderShare();
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));

    const link = await screen.findByLabelText('Share link');
    expect(link).toHaveValue(`${window.location.origin}/s/abc`);
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/shares');
    const sent = JSON.parse(init?.body as string) as { name: string; versions: unknown[] };
    expect(sent.name).toBe('Shop');
    expect(sent.versions).toEqual([]);
    expect(screen.getByRole('link', { name: /Open/ })).toHaveAttribute(
      'href',
      `${window.location.origin}/s/abc`,
    );

    writeText.mockResolvedValue();
    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/abc`);
  });

  it('explains when copying is blocked', async () => {
    respond(201, { id: 'abc' });
    writeText.mockRejectedValue(new Error('denied'));
    renderShare();
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Copy link/ }));
    expect(await screen.findByText(/Copying is not allowed here/)).toBeInTheDocument();
  });

  it('shows why sharing failed', async () => {
    respond(413, { error: 'The project is larger than 2 MB' });
    renderShare();
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    expect(await screen.findByText('The project is larger than 2 MB')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Share link')).not.toBeInTheDocument());
  });
});
