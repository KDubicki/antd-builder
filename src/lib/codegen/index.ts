import { getComponentMeta } from '@/lib/registry';
import type { BuilderNode, ProjectTheme } from '@/lib/schema';
import { algorithmNames } from '@/lib/theme';

const INDENT = '  ';

/** A JSX attribute. Strings that JSX can't hold literally (quotes, `&` entities…) become expressions. */
function attribute(key: string, value: unknown): string {
  if (value === true) return key;
  if (typeof value === 'string' && !/["\\&\r\n]/.test(value)) return `${key}="${value}"`;
  return `${key}={${JSON.stringify(value)}}`;
}

/** JSX text content. Anything JSX would reinterpret (braces, tags, whitespace) becomes an expression. */
function textChild(text: string): string {
  return /^[^{}<>&\r\n]*$/.test(text) && text.trim() === text ? text : `{${JSON.stringify(text)}}`;
}

/**
 * Renders a node tree to JSX. A string `children` prop on a leaf becomes the element's text;
 * other props become attributes (`undefined` props are omitted).
 */
export function nodeToJsx(node: BuilderNode, indent = 0): string {
  const pad = INDENT.repeat(indent);
  const { children: text, ...rest } = node.props;
  const isTextLeaf = node.children.length === 0 && typeof text === 'string';
  // Child nodes win over a `children` prop; a text leaf renders its text as content.
  const props = node.children.length > 0 || isTextLeaf ? rest : node.props;
  const attrs = Object.entries(props)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => attribute(key, value));
  const open = [node.component, ...attrs].join(' ');

  if (isTextLeaf) return `${pad}<${open}>${textChild(text)}</${node.component}>`;
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

/** "my shop 2" -> "MyShop2Page", "landing page" -> "LandingPage"; "Page" if nothing usable remains. */
export function pageComponentName(projectName: string): string {
  const pascal = projectName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join('')
    .replace(/^[0-9]+/, '');
  if (!pascal) return 'Page';
  return pascal.endsWith('Page') ? pascal : `${pascal}Page`;
}

function themeConfigSource(projectTheme: ProjectTheme): string | null {
  const algorithms = algorithmNames(projectTheme);
  const tokens = Object.entries(projectTheme.token);
  if (algorithms.length === 0 && tokens.length === 0) return null;

  const lines = ['const themeConfig: ThemeConfig = {'];
  if (algorithms.length > 0) {
    lines.push(`${INDENT}algorithm: [${algorithms.map((name) => `theme.${name}`).join(', ')}],`);
  }
  if (tokens.length > 0) {
    lines.push(`${INDENT}token: {`);
    for (const [key, value] of tokens)
      lines.push(`${INDENT.repeat(2)}${key}: ${JSON.stringify(value)},`);
    lines.push(`${INDENT}},`);
  }
  lines.push('};');
  return lines.join('\n');
}

function unknownComponents(node: BuilderNode, into = new Set<string>()): string[] {
  if (!getComponentMeta(node.component)) into.add(node.component);
  for (const child of node.children) unknownComponents(child, into);
  return [...into];
}

export interface PageSource {
  name: string;
  root: BuilderNode;
  theme: ProjectTheme;
}

/** Generates a self-contained React + TypeScript page component for a project page. */
export function generatePage({ name, root, theme }: PageSource): string {
  const themeConfig = themeConfigSource(theme);
  const imports = collectImports(root);
  if (themeConfig) imports.add('ConfigProvider');
  if (themeConfig && algorithmNames(theme).length > 0) imports.add('theme');

  const unknown = unknownComponents(root);
  if (unknown.length > 0)
    throw new Error(`Cannot export unknown components: ${unknown.join(', ')}`);

  const sorted = [...imports].sort((a, b) => a.localeCompare(b));
  const header = [
    "'use client';",
    '',
    `import { ${sorted.join(', ')} } from 'antd';`,
    ...(themeConfig ? ["import type { ThemeConfig } from 'antd';"] : []),
    '',
    ...(themeConfig ? [themeConfig, ''] : []),
  ];

  const body = themeConfig
    ? [
        `${INDENT.repeat(2)}<ConfigProvider theme={themeConfig}>`,
        nodeToJsx(root, 3),
        `${INDENT.repeat(2)}</ConfigProvider>`,
      ]
    : [nodeToJsx(root, 2)];

  return [
    ...header,
    `export default function ${pageComponentName(name)}() {`,
    `${INDENT}return (`,
    ...body,
    `${INDENT});`,
    '}',
    '',
  ].join('\n');
}
