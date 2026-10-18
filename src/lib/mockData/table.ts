import type { DataBinding } from './binding';

export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
}

/** Table props showing a data source: columns, rows bound to it, and the row key if needed. */
export interface TablePlan {
  columns: TableColumn[];
  dataSource: DataBinding;
  rowKey?: string;
}

/** Rows looked at when collecting columns: enough for optional fields, cheap for long lists. */
const SAMPLE_ROWS = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRowList = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.length > 0 && value.every(isRecord);

/** Column title for a field name: `firstName` or `first_name` -> "First name". */
export function columnTitle(field: string): string {
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  const title = words.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * How to show `data` (a data source's response) as a table, or `null` when it holds no list of
 * objects. The list is the response itself or a top-level field of it (`{ items: [...] }`).
 * Columns are the fields with plain values, in the order they first appear; `key` is antd's row
 * key, so it isn't a column, and without it an `id` field becomes the row key.
 */
export function planTable(sourceId: string, data: unknown): TablePlan | null {
  let rows: Record<string, unknown>[];
  let path: string | undefined;
  if (isRowList(data)) {
    rows = data;
  } else if (isRecord(data)) {
    const field = Object.keys(data).find((name) => isRowList(data[name]));
    if (field === undefined) return null;
    rows = data[field] as Record<string, unknown>[];
    path = field;
  } else {
    return null;
  }

  const fields: string[] = [];
  for (const row of rows.slice(0, SAMPLE_ROWS)) {
    for (const [field, value] of Object.entries(row)) {
      const plain = value === null || ['string', 'number', 'boolean'].includes(typeof value);
      if (plain && field !== 'key' && !fields.includes(field)) fields.push(field);
    }
  }
  if (fields.length === 0) return null;

  const hasKey = rows.every((row) => 'key' in row);
  const hasId = rows.every((row) => 'id' in row);
  return {
    columns: fields.map((field) => ({ title: columnTitle(field), dataIndex: field, key: field })),
    dataSource: path === undefined ? { $data: sourceId } : { $data: sourceId, path },
    ...(!hasKey && hasId ? { rowKey: 'id' } : {}),
  };
}
