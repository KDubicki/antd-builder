import { type Block, getBlock, node } from '@/lib/blocks';
import type { BuilderNode } from '@/lib/schema';
import type { SampleData, SourceLookup } from './types';

export { node };

function requireBlock(id: string): Block {
  const block = getBlock(id);
  if (!block) throw new Error(`Unknown block: ${id}`);
  return block;
}

/** A ready-made block's mock data, for a template's `data`. */
export function blockData(id: string): SampleData {
  const { data } = requireBlock(id);
  if (!data) throw new Error(`Block ${id} has no data`);
  return data;
}

/** A ready-made block's tree, bound to the template's copy of its data. */
export function fromBlock(id: string, source: SourceLookup): BuilderNode {
  const block = requireBlock(id);
  return block.build(block.data ? source(block.data.name) : '');
}

/** A page section: heading, optional tagline and the content below them. */
export function section(title: string, tagline: string | null, content: BuilderNode[]) {
  return node('Flex', { vertical: true, gap: 'middle' }, [
    node('Typography.Title', { children: title, level: 2 }),
    ...(tagline ? [node('Typography.Paragraph', { children: tagline, type: 'secondary' })] : []),
    ...content,
  ]);
}
