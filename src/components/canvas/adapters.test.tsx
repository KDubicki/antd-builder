import { describe, expect, it } from 'vitest';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { childNode } from './adapters';

/** Stands in for `CanvasNode`, which carries its node as a prop. */
const Holder: (props: { node: BuilderNode }) => null = () => null;

describe('childNode', () => {
  it('reads the builder node from a canvas child element', () => {
    const node = createNode('Tag', 't');
    expect(childNode(<Holder node={node} />)).toBe(node);
  });

  it('is undefined for text and plain elements', () => {
    expect(childNode('text')).toBeUndefined();
    expect(childNode(<div />)).toBeUndefined();
  });
});
