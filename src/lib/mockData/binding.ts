import type { PropDefinition } from '@/lib/registry';
import type { DataSource } from '@/lib/schema';

/**
 * A prop value that reads from mock data instead of holding a literal: the data source's id
 * (stable across renames) and an optional dot path into its JSON, e.g. `0.name` or `meta.total`.
 */
export interface DataBinding {
  $data: string;
  path?: string;
}

export function isBinding(value: unknown): value is DataBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { $data?: unknown }).$data === 'string'
  );
}

/** `" items.0.name "` -> `['items', '0', 'name']`; empty for the whole response. */
export function pathSegments(path: string | undefined): string[] {
  return (path ?? '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** The value at `path` in `data`, or `undefined` when the path leads nowhere. */
export function readPath(data: unknown, path: string | undefined): unknown {
  let value = data;
  for (const segment of pathSegments(path)) {
    if (typeof value !== 'object' || value === null) return undefined;
    if (!Object.hasOwn(value, segment)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

/** "a list", "text"… for messages about mismatched data. */
export function kindOf(value: unknown): string {
  if (Array.isArray(value)) return 'a list';
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return 'text';
    case 'number':
      return 'a number';
    case 'boolean':
      return 'true/false';
    default:
      return 'an object';
  }
}

export type Resolution =
  | {
      ok: true;
      value: unknown;
      /** The data was a number or boolean shown as text (exported as `String(…)`). */
      converted: boolean;
    }
  | { ok: false; error: string };

const fail = (error: string): Resolution => ({ ok: false, error });

/**
 * Reads a binding's value and checks it fits the prop: text props also take numbers and
 * true/false (as text), enum props one of their options, JSON props anything.
 */
export function resolveBinding(
  binding: DataBinding,
  def: PropDefinition | undefined,
  sources: readonly DataSource[],
): Resolution {
  const source = sources.find((candidate) => candidate.id === binding.$data);
  if (!source) return fail('Its data source was deleted');
  const value = readPath(source.data, binding.path);
  if (value === undefined || value === null) {
    const path = pathSegments(binding.path).join('.');
    return fail(path ? `No value at "${path}"` : 'The response is empty');
  }

  const ok = (converted = false): Resolution => ({
    ok: true,
    value: converted ? String(value) : value,
    converted,
  });
  switch (def?.type) {
    case undefined:
    case 'json':
      return ok();
    case 'string':
      if (typeof value === 'string') return ok();
      if (typeof value === 'number' || typeof value === 'boolean') return ok(true);
      return fail(`Expected text, got ${kindOf(value)}`);
    case 'number':
      return typeof value === 'number' ? ok() : fail(`Expected a number, got ${kindOf(value)}`);
    case 'boolean':
      return typeof value === 'boolean' ? ok() : fail(`Expected true/false, got ${kindOf(value)}`);
    case 'enum':
      return (def.options as readonly unknown[]).includes(value)
        ? ok()
        : fail(`Expected one of ${def.options.join(', ')}`);
  }
}

/**
 * Props with bindings replaced by their data. Bindings that don't resolve are left out, so the
 * component falls back to its default. Returns `props` itself when nothing is bound.
 */
export function resolveProps(
  props: Readonly<Record<string, unknown>>,
  defs: Readonly<Record<string, PropDefinition>>,
  sources: readonly DataSource[],
): Record<string, unknown> {
  if (!Object.values(props).some(isBinding)) return props as Record<string, unknown>;
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!isBinding(value)) {
      resolved[key] = value;
      continue;
    }
    const result = resolveBinding(value, defs[key], sources);
    if (result.ok) resolved[key] = result.value;
  }
  return resolved;
}
