import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { DataPanel } from './DataPanel';

const fetchMock = vi.fn<typeof fetch>();
const sources = () => useEditorStore.getState().mockData;

beforeEach(() => {
  useEditorStore.setState({ mockData: [], past: [], future: [], lastEdit: null });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

const urlField = () => screen.getByLabelText('Import from URL');
const importButton = () => screen.getByRole('button', { name: /Import$/ });

describe('Import from URL', () => {
  it('adds a data source named after the URL, holding its response', async () => {
    respond(200, { data: [{ id: 1, title: 'Hello' }] });
    render(<DataPanel />);
    expect(importButton()).toBeDisabled();

    fireEvent.change(urlField(), { target: { value: ' https://API.example.com/v1/posts ' } });
    fireEvent.click(importButton());

    await waitFor(() => expect(sources()).toHaveLength(1));
    expect(sources()[0]).toMatchObject({
      name: 'posts',
      data: [{ id: 1, title: 'Hello' }],
      url: 'https://api.example.com/v1/posts',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/fetch',
      expect.objectContaining({ body: '{"url":"https://API.example.com/v1/posts"}' }),
    );
    expect(urlField()).toHaveValue('');
    expect(screen.getByText('From https://api.example.com/v1/posts')).toBeInTheDocument();
    expect(screen.getByText('List of 1 item')).toBeInTheDocument();
  });

  it('shows why an import failed until the URL is edited', async () => {
    respond(400, { error: "That address isn't allowed" });
    render(<DataPanel />);
    fireEvent.change(urlField(), { target: { value: 'http://localhost/' } });
    fireEvent.keyDown(urlField(), { key: 'Enter', code: 'Enter', keyCode: 13 });

    expect(await screen.findByText("That address isn't allowed")).toBeInTheDocument();
    expect(sources()).toEqual([]);
    fireEvent.change(urlField(), { target: { value: 'http://localhost/x' } });
    expect(screen.getByText('Fetches a sample response from a public API.')).toBeInTheDocument();
  });

  it('imports once when Enter is pressed again while fetching', async () => {
    respond(200, { data: [] });
    render(<DataPanel />);
    fireEvent.change(urlField(), { target: { value: 'https://api.example.com/posts' } });
    for (let i = 0; i < 2; i++) {
      fireEvent.keyDown(urlField(), { key: 'Enter' });
      fireEvent.keyUp(urlField(), { key: 'Enter' });
    }
    await waitFor(() => expect(sources()).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a blank URL', () => {
    render(<DataPanel />);
    fireEvent.change(urlField(), { target: { value: '   ' } });
    fireEvent.keyDown(urlField(), { key: 'Enter', code: 'Enter', keyCode: 13 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Refresh', () => {
  const imported = (data: unknown) =>
    useEditorStore.setState({
      mockData: [{ id: 'p', name: 'posts', data: data as never, url: 'https://x.dev/posts' }],
    });
  const refresh = () => screen.getByRole('button', { name: 'Refresh posts from its URL' });

  it('fetches the URL again and replaces the data, as one undo step', async () => {
    imported([1]);
    respond(200, { data: [1, 2, 3] });
    render(<DataPanel />);
    fireEvent.click(refresh());

    await waitFor(() => expect(sources()[0]?.data).toEqual([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/fetch',
      expect.objectContaining({ body: '{"url":"https://x.dev/posts"}' }),
    );
    useEditorStore.getState().undo();
    expect(sources()[0]?.data).toEqual([1]);
  });

  it('keeps the data and explains a failed refresh', async () => {
    imported([1]);
    respond(502, { error: 'The server answered with status 500' });
    render(<DataPanel />);
    fireEvent.click(refresh());

    expect(await screen.findByRole('alert')).toHaveTextContent('status 500');
    expect(sources()[0]?.data).toEqual([1]);

    // antd clears a button's loading state in an effect; until then it ignores clicks.
    await waitFor(() => expect(refresh()).not.toHaveClass('ant-btn-loading'));
    respond(200, { data: [2] });
    fireEvent.click(refresh());
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('is only offered for imported sources', () => {
    useEditorStore.setState({ mockData: [{ id: 'd', name: 'data', data: [] }] });
    render(<DataPanel />);
    expect(screen.queryByRole('button', { name: /Refresh/ })).not.toBeInTheDocument();
  });
});
