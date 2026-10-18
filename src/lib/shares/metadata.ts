import type { Metadata } from 'next';
import { parseProject } from '@/lib/project';
import type { BuilderNode } from '@/lib/schema';

const countNodes = (node: BuilderNode): number =>
  node.children.reduce((sum, child) => sum + 1 + countNodes(child), 0);

/**
 * Page metadata for a shared project, so a pasted link previews as the project's name. Shared
 * pages stay out of search results: links are private to whoever has them.
 */
export function shareMetadata(json: string | null): Metadata {
  const robots = { index: false, follow: false };
  const result = json === null ? null : parseProject(json);
  if (!result?.ok) return { title: 'Shared project · antd-builder', robots };

  const { name, root } = result.content;
  const count = countNodes(root);
  const description = `A read-only page with ${count} component${count === 1 ? '' : 's'}, shared from antd-builder.`;
  return {
    title: `${name} · antd-builder`,
    description,
    openGraph: { title: name, description, type: 'website', siteName: 'antd-builder' },
    robots,
  };
}
