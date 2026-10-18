import type { DataSource } from '@/lib/schema';

/**
 * Data source names become `const` names in exported code. Lowercase-first identifiers can't
 * collide with antd imports or the page component, which are PascalCase.
 */
const NAME_PATTERN = /^[a-z_$][A-Za-z0-9_$]*$/;

/** Names the exported page already uses, plus JS reserved words. */
const RESERVED = new Set([
  'theme',
  'themeConfig',
  ...['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default'],
  ...['delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for'],
  ...['function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new'],
  ...['null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super'],
  ...['switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with'],
  ...['yield', 'undefined', 'arguments', 'eval'],
]);

/** Why `name` can't name a data source (given the other sources' names), or `null` if it can. */
export function sourceNameError(name: string, otherNames: readonly string[]): string | null {
  if (name === '') return 'Enter a name';
  if (!NAME_PATTERN.test(name)) {
    return 'Use letters, digits, _ or $, starting with a lowercase letter';
  }
  if (RESERVED.has(name)) return `"${name}" is reserved`;
  if (otherNames.includes(name)) return `"${name}" is already used`;
  return null;
}

/** `base`, or `base2`, `base3`… whichever is free. */
export function uniqueSourceName(base: string, names: readonly string[]): string {
  if (!names.includes(base)) return base;
  let n = 2;
  while (names.includes(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

/**
 * Sample response for a new data source: a small list, the most common API shape. `key` comes
 * last so text props bind to a name first; antd tables use it as the row key.
 */
export const SAMPLE_DATA = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', key: '1' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', key: '2' },
  { name: 'Carol White', email: 'carol@example.com', role: 'Viewer', key: '3' },
];

export function createDataSource(
  name: string,
  data: DataSource['data'] = structuredClone(SAMPLE_DATA),
): DataSource {
  return { id: crypto.randomUUID(), name, data };
}

/**
 * A data source name suggested by an API URL: its last meaningful path segment in camelCase,
 * e.g. `https://api.example.com/v1/user-list/42` -> `userList`. Falls back to `data`.
 */
export function sourceNameFromUrl(url: string): string {
  let segments: string[];
  try {
    segments = new URL(url).pathname.split('/').map(decodeURIComponent);
  } catch {
    return 'data';
  }
  const segment = segments
    .map((part) => part.replace(/\.[a-z]+$/i, '')) // users.json
    .reverse()
    .find((part) => /[a-z]/i.test(part) && !/^v\d+$/i.test(part) && part !== 'api');
  const words = segment?.split(/[^A-Za-z0-9]+/).filter(Boolean) ?? [];
  const name = words
    .map((word, i) =>
      i === 0 ? word[0]!.toLowerCase() + word.slice(1) : word[0]!.toUpperCase() + word.slice(1),
    )
    .join('');
  if (sourceNameError(name, []) === null) return name;
  // Reserved words and names starting with a digit get a suffix or fall back.
  return sourceNameError(`${name}Data`, []) === null ? `${name}Data` : 'data';
}

export * from './binding';
