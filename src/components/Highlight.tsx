import { Fragment } from 'react';

/** `text` with each search term from `query` marked, ignoring case, as filters match them. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // A capturing split keeps the matches, at odd indexes.
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'i'));
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}
