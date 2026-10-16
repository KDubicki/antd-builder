import { type DataBinding, isBinding, pathSegments, resolveBinding } from '@/lib/mockData';
import { type PropDefinition, antdProps, getComponentMeta } from '@/lib/registry';
import type { BuilderNode, DataSource, ProjectTheme } from '@/lib/schema';
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

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** `.name`, `[0]` or `["odd key"]`, as optional chaining (`?.`) when `optional`. */
function accessor(segment: string, optional: boolean): string {
  if (IDENTIFIER.test(segment)) return `${optional ? '?.' : '.'}${segment}`;
  const key = /^\d+$/.test(segment) ? segment : JSON.stringify(segment);
  return `${optional ? '?.' : ''}[${key}]`;
}

/**
 * Source for a bound prop, e.g. `users[0]?.name`, or `null` when the binding doesn't resolve
 * (the prop is then left out, as on the canvas). Every access after the first is optional, so
 * the code stays valid under `noUncheckedIndexedAccess` and with data of another shape later.
 */
function bindingExpression(
  binding: DataBinding,
  def: PropDefinition | undefined,
  sources: readonly DataSource[],
): string | null {
  const resolution = resolveBinding(binding, def, sources);
  const source = sources.find((candidate) => candidate.id === binding.$data);
  if (!resolution.ok || !source) return null;
  const expression =
    source.name +
    pathSegments(binding.path)
      .map((segment, i) => accessor(segment, i > 0))
      .join('');
  return resolution.converted ? `String(${expression})` : expression;
}

/**
 * Renders a node tree to JSX. A string `children` prop on a leaf becomes the element's text;
 * other props become attributes (`undefined` props are omitted), followed by the component's
 * code props written as source.
 */
export function nodeToJsx(
  node: BuilderNode,
  indent = 0,
  sources: readonly DataSource[] = [],
): string {
  const pad = INDENT.repeat(indent);
  const meta = getComponentMeta(node.component);
  // Bound props become expressions; unresolved ones are dropped, as on the canvas.
  const expressions = new Map<string, string>();
  const editorLiterals: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.props)) {
    if (!isBinding(value)) editorLiterals[key] = value;
    else {
      const expression = bindingExpression(value, meta?.props[key], sources);
      if (expression) expressions.set(key, expression);
    }
  }
  // Literal props in antd's shape (see `toProps`); a bound prop wins over a literal of its key.
  const literals = Object.fromEntries(
    Object.entries(meta ? antdProps(meta, editorLiterals) : editorLiterals).filter(
      ([key]) => !expressions.has(key),
    ),
  );

  const { children: text, ...rest } = literals;
  const boundText = expressions.get('children');
  const isTextLeaf =
    node.children.length === 0 && (typeof text === 'string' || boundText !== undefined);
  // Child nodes win over a `children` prop; a text leaf renders its text as content.
  const props = node.children.length > 0 || isTextLeaf ? rest : literals;
  if (node.children.length > 0 || isTextLeaf) expressions.delete('children');
  const codeProps = Object.entries(meta?.codeProps ?? {});
  const attrs = [
    ...Object.entries(props)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => attribute(key, value)),
    ...[...expressions].map(([key, expression]) => `${key}={${expression}}`),
    ...codeProps.map(([key, prop]) => `${key}={${prop.source}}`),
  ];
  const open = [node.component, ...attrs].join(' ');

  if (isTextLeaf) {
    const content = boundText !== undefined ? `{${boundText}}` : textChild(text as string);
    return `${pad}<${open}>${content}</${node.component}>`;
  }
  if (node.children.length === 0) {
    const required =
      meta?.childrenRequired && !('children' in props) && !expressions.has('children');
    return required ? `${pad}<${open}>{null}</${node.component}>` : `${pad}<${open} />`;
  }

  const children = node.children.map((child) => nodeToJsx(child, indent + 1, sources)).join('\n');
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
  mockData?: readonly DataSource[];
}

/** Ids of the data sources that props in the tree are bound to. */
export function boundSourceIds(node: BuilderNode, into = new Set<string>()): Set<string> {
  for (const value of Object.values(node.props)) if (isBinding(value)) into.add(value.$data);
  for (const child of node.children) boundSourceIds(child, into);
  return into;
}

/** `const` declarations for the mock data the page uses, in Data panel order. */
function mockDataSource(root: BuilderNode, sources: readonly DataSource[]): string | null {
  const used = boundSourceIds(root);
  const declarations = sources
    .filter((source) => used.has(source.id))
    .map((source) => `const ${source.name} = ${JSON.stringify(source.data, null, 2)};`);
  if (declarations.length === 0) return null;
  return ['// Mock API responses: replace with real data fetching.', ...declarations].join('\n');
}

/** Generates a self-contained React + TypeScript page component for a project page. */
export function generatePage({ name, root, theme, mockData = [] }: PageSource): string {
  const themeConfig = themeConfigSource(theme);
  const data = mockDataSource(root, mockData);
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
    ...(data ? [data, ''] : []),
  ];

  const body = themeConfig
    ? [
        `${INDENT.repeat(2)}<ConfigProvider theme={themeConfig}>`,
        nodeToJsx(root, 3, mockData),
        `${INDENT.repeat(2)}</ConfigProvider>`,
      ]
    : [nodeToJsx(root, 2, mockData)];

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
