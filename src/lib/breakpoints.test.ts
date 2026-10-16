import { describe, expect, it } from 'vitest';
import { colPropsAt } from './breakpoints';

describe('colPropsAt', () => {
  const props = { span: 8, xs: 24, md: 12, offset: 0 };

  it('uses the largest active breakpoint that is set', () => {
    expect(colPropsAt(props, 375)).toEqual({ span: 24, offset: 0 });
    expect(colPropsAt(props, 600)).toEqual({ span: 24, offset: 0 }); // sm unset: xs still applies
    expect(colPropsAt(props, 768)).toEqual({ span: 12, offset: 0 });
    expect(colPropsAt(props, 1400)).toEqual({ span: 12, offset: 0 });
  });

  it('falls back to span, and keeps 0 (hidden) spans', () => {
    expect(colPropsAt({ span: 6, lg: 4 }, 375)).toEqual({ span: 6 });
    expect(colPropsAt({ xs: 0, md: 8 }, 375)).toEqual({ span: 0 });
    expect(colPropsAt({}, 375)).toEqual({});
  });
});
