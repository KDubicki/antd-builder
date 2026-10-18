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

  it('ignores a blank URL', () => {
    render(<DataPanel />);
    fireEvent.change(urlField(), { target: { value: '   ' } });
    fireEvent.keyDown(urlField(), { key: 'Enter', code: 'Enter', keyCode: 13 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
