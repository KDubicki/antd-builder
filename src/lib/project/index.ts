import { ROOT_ID } from '@/lib/editor/store';
import { canContain, getComponentMeta } from '@/lib/registry';
import { sourceNameError } from '@/lib/mockData';
import {
  type BuilderNode,
  type CustomBlock,
  type DataSource,
  type Project,
  type ProjectTheme,
  projectSchema,
} from '@/lib/schema';

export const PAGE_ID = 'home';

export interface ProjectContent {
  name: string;
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: DataSource[];
  customBlocks: CustomBlock[];
}

/** Builds the project document. The editor edits a single page for now. */
export function toProject({
  name,
  root,
  theme,
  mockData = [],
  customBlocks = [],
}: Omit<ProjectContent, 'mockData' | 'customBlocks'> &
  Partial<Pick<ProjectContent, 'mockData' | 'customBlocks'>>): Project {
  return {
    version: 1,
    name,
    theme,
    pages: [{ id: PAGE_ID, name: 'Home', root }],
    customComponents: [],
    mockData,
    customBlocks,
  };
}

export type ParseResult = { ok: true; content: ProjectContent } | { ok: false; error: string };

/** Problems that the schema can't express: unknown components, broken nesting, duplicate ids. */
function treeErrors(root: BuilderNode): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const visit = (node: BuilderNode, parent?: BuilderNode) => {
    if (seen.has(node.id)) errors.push(`Duplicate node id "${node.id}"`);
    seen.add(node.id);
    if (!getComponentMeta(node.component)) {
      errors.push(`Unknown component "${node.component}"`);
    } else if (
      parent &&
      getComponentMeta(parent.component) &&
      !canContain(parent.component, node.component)
    ) {
      errors.push(`"${node.component}" can't be placed inside "${parent.component}"`);
    }
    for (const child of node.children) visit(child, node);
  };
  visit(root);
  return errors;
}

/** Invalid or duplicate data source names and ids. */
function mockDataErrors(sources: readonly DataSource[]): string[] {
  const errors: string[] = [];
  sources.forEach((source, i) => {
    const before = sources.slice(0, i);
    const nameError = sourceNameError(
      source.name,
      before.map((other) => other.name),
    );
    if (nameError) errors.push(`Data source "${source.name}": ${nameError}`);
    if (before.some((other) => other.id === source.id)) {
      errors.push(`Duplicate data source id "${source.id}"`);
    }
  });
  return errors;
}

/** Parses and validates a project file. */
export function parseProject(json: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }

  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'project';
    return { ok: false, error: `Invalid project file: ${path}: ${issue?.message ?? 'invalid'}` };
  }

  const page = parsed.data.pages[0];
  if (!page) return { ok: false, error: 'The project has no pages.' };

  // The editor addresses the page root by a fixed id.
  const root = { ...page.root, id: ROOT_ID };
  const errors = treeErrors(root);
  if (errors.length > 0) return { ok: false, error: `Invalid page tree: ${errors.join('; ')}` };
  const dataErrors = mockDataErrors(parsed.data.mockData);
  if (dataErrors.length > 0) {
    return { ok: false, error: `Invalid mock data: ${dataErrors.join('; ')}` };
  }

  for (const block of parsed.data.customBlocks) {
    const blockErrors = treeErrors(block.root);
    if (blockErrors.length > 0) {
      return { ok: false, error: `Invalid block "${block.name}": ${blockErrors.join('; ')}` };
    }
  }

  const { name, theme, mockData, customBlocks } = parsed.data;
  return { ok: true, content: { name, root, theme, mockData, customBlocks } };
}

/** File name for a downloaded project, e.g. "My shop" -> "my-shop.json". */
export function projectFileName(name: string, extension = 'json'): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'project'}.${extension}`;
}
