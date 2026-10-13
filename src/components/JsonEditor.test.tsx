import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JsonEditor } from './JsonEditor';

describe('JsonEditor', () => {
  it('applies valid JSON while typing and flags invalid drafts', () => {
    const onChange = vi.fn();
    render(<JsonEditor aria-label="Data" value={[1]} onChange={onChange} />);
    const field = screen.getByLabelText('Data');
    expect(field).toHaveValue('[\n  1\n]');

    fireEvent.change(field, { target: { value: '{"a": 1}' } });
    expect(onChange).toHaveBeenLastCalledWith({ a: 1 }, true);

    fireEvent.change(field, { target: { value: '{"a":' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(field); // invalid drafts survive blur
    expect(field).toHaveValue('{"a":');
  });

  it('reports empty text as undefined', () => {
    const onChange = vi.fn();
    render(<JsonEditor aria-label="Data" value={1} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '  ' } });
    expect(onChange).toHaveBeenCalledWith(undefined, true);
  });
});
