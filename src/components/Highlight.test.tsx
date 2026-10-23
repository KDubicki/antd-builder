import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlight } from './Highlight';

const marked = (text: string, query: string) => {
  const { container } = render(<Highlight text={text} query={query} />);
  return { html: container.innerHTML, marks: [...container.querySelectorAll('mark')] };
};

describe('Highlight', () => {
  it('marks every term, ignoring case', () => {
    const { marks, html } = marked('Grid column', 'col GRID');
    expect(marks.map((mark) => mark.textContent)).toEqual(['Grid', 'col']);
    expect(html).toBe('<mark>Grid</mark> <mark>col</mark>umn');
  });

  it('leaves text alone without a query', () => {
    expect(marked('Card', '  ').html).toBe('Card');
  });

  it('treats regex characters literally', () => {
    expect(marked('a.b (c)', '(c)').marks.map((mark) => mark.textContent)).toEqual(['(c)']);
    expect(marked('ab', '.').marks).toEqual([]);
  });
});
