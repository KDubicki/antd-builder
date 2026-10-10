import type { BuilderNode } from '@/lib/schema';

/** Renders a node tree to JSX. Prop values are serialized as JSON expressions. */
export function nodeToJsx(node: BuilderNode, indent = 0): string {
  const pad = '  '.repeat(indent);
  const props = Object.entries(node.props)
    .map(([key, value]) =>
      typeof value === 'string'
        ? `${key}=${JSON.stringify(value)}`
        : `${key}={${JSON.stringify(value)}}`,
    )
    .join(' ');
  const open = props ? `${node.component} ${props}` : node.component;

  if (node.children.length === 0) return `${pad}<${open} />`;

  const children = node.children.map((child) => nodeToJsx(child, indent + 1)).join('\n');
  return `${pad}<${open}>\n${children}\n${pad}</${node.component}>`;
}

/** Collects the top-level antd import names used in a tree (e.g. "Form.Item" -> "Form"). */
export function collectImports(node: BuilderNode, into = new Set<string>()): Set<string> {
  const root = node.component.split('.')[0];
  if (root) into.add(root);
  for (const child of node.children) collectImports(child, into);
  return into;
}
