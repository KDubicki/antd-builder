import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTemplate } from '@/lib/templates';
import { PREVIEW_PAGE_WIDTH, TemplatePreview } from './TemplatePreview';

afterEach(() => vi.restoreAllMocks());

describe('TemplatePreview', () => {
  it('shows the real page, hidden from assistive technology', () => {
    render(<TemplatePreview template={getTemplate('dashboard')!} />);
    const frame = screen.getByTestId('template-preview-dashboard');
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(frame).toHaveAttribute('inert');
    expect(frame).toHaveTextContent('Recent orders');
    expect(frame).toHaveTextContent('Carol White');
  });

  it('scales the desktop-wide page down to its frame', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(PREVIEW_PAGE_WIDTH / 4);
    render(<TemplatePreview template={getTemplate('landing')!} />);
    const page = screen.getByTestId('template-preview-landing').firstElementChild as HTMLElement;
    expect(page.style.width).toBe(`${PREVIEW_PAGE_WIDTH}px`);
    expect(page.style.transform).toBe('scale(0.25)');
  });
});
