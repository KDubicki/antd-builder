import { describe, expect, it } from 'vitest';
import { blockData, fromBlock, section } from './helpers';

describe('template helpers', () => {
  it('reuse a block with its data', () => {
    expect(blockData('faq').name).toBe('faqs');
    const tree = fromBlock('faq', (name) => `id-of-${name}`);
    expect(tree.children[1]!.props.items).toEqual({ $data: 'id-of-faqs' });
    expect(fromBlock('footer', () => 'unused').component).toBe('Flex');
  });

  it('refuse unknown blocks and blocks without data', () => {
    expect(() => fromBlock('nope', () => '')).toThrow('Unknown block: nope');
    expect(() => blockData('footer')).toThrow('Block footer has no data');
  });

  it('build a section with or without a tagline', () => {
    const titled = (tagline: string | null) =>
      section('Title', tagline, []).children.map((child) => child.component);
    expect(titled('Tagline')).toEqual(['Typography.Title', 'Typography.Paragraph']);
    expect(titled(null)).toEqual(['Typography.Title']);
  });
});
