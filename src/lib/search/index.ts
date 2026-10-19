/** What a search looks at: a label, an optional name and a description. */
interface Searchable {
  label: string;
  name?: string;
  description: string;
}

/**
 * Whether an item matches a search (palette, inspector props): every whitespace-separated term must appear in its
 * label, name or description, ignoring case. An empty query matches everything.
 */
export function matchesQuery(item: Searchable, query: string): boolean {
  const haystack = `${item.label} ${item.name ?? ''} ${item.description}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}
