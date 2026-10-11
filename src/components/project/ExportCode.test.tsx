import { act, fireEvent, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePage } from '@/lib/codegen';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { ExportCode } from './ExportCode';

const renderExport = () =>
  render(
    <App>
      <ExportCode />
    </App>,
  );

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  useEditorStore.setState({
    name: 'Shop',
    root: { ...createRoot(), children: [createNode('Button', 'btn')] },
    theme: createTheme(),
  });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  writeText.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('ExportCode', () => {
  it('shows the generated page', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Export code/ }));
    expect(await screen.findByLabelText('Generated TSX')).toHaveTextContent(
      'export default function ShopPage()',
    );
    expect(screen.getByLabelText('Generated TSX').textContent).toBe(
      generatePage(useEditorStore.getState()),
    );
  });

  it('copies the code', async () => {
    writeText.mockResolvedValue();
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Export code/ }));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /Copy/ })));
    expect(writeText).toHaveBeenCalledWith(generatePage(useEditorStore.getState()));
    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument();
  });

  it('explains when the clipboard is blocked', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Export code/ }));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /Copy/ })));
    expect(await screen.findByText(/use Download instead/)).toBeInTheDocument();
  });

  it('downloads the page as a .tsx file', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:code');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Export code/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Download shop\.tsx/ }));
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('shop.tsx');
  });

  it('reports projects that cannot be exported', async () => {
    useEditorStore.setState({
      root: {
        ...createRoot(),
        children: [{ id: 'm', component: 'Marquee', props: {}, children: [] }],
      },
    });
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Export code/ }));
    expect(
      await screen.findByText('Cannot export unknown components: Marquee'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Generated TSX')).not.toBeInTheDocument();
  });
});
