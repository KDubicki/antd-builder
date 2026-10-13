'use client';

import { useDraggable } from '@dnd-kit/core';
import { SearchOutlined } from '@ant-design/icons';
import { Empty, Flex, Input, Typography, theme } from 'antd';
import { useState } from 'react';
import type { DragData } from '@/lib/editor/drop';
import {
  type ComponentCategory,
  type ComponentMeta,
  categoryLabels,
  components,
} from '@/lib/registry';

function PaletteItem({ meta }: { meta: ComponentMeta }) {
  const { token } = theme.useToken();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${meta.name}`,
    data: { type: 'palette', component: meta.name } satisfies DragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={meta.description}
      style={{
        padding: `${token.paddingXXS}px ${token.paddingSM}px`,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        background: token.colorBgContainer,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {meta.label}
    </div>
  );
}

/**
 * Whether `meta` matches a palette search: every whitespace-separated term must appear in its
 * label, name or description, ignoring case. An empty query matches everything.
 */
export function matchesQuery(meta: ComponentMeta, query: string): boolean {
  const haystack = `${meta.label} ${meta.name} ${meta.description}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** Components grouped by category, in display order, skipping categories left empty. */
function groupByCategory(list: readonly ComponentMeta[]) {
  return (Object.keys(categoryLabels) as ComponentCategory[])
    .map((category) => ({ category, items: list.filter((meta) => meta.category === category) }))
    .filter((group) => group.items.length > 0);
}

export function Palette() {
  const { token } = theme.useToken();
  const [query, setQuery] = useState('');
  const groups = groupByCategory(components.filter((meta) => matchesQuery(meta, query)));

  return (
    <Flex vertical gap="middle" style={{ padding: token.padding }} aria-label="Component palette">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search components"
        aria-label="Search components"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
      />
      {groups.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No components match" />
      )}
      {groups.map(({ category, items }) => (
        <Flex key={category} vertical gap="small">
          <Typography.Text type="secondary" strong>
            {categoryLabels[category]}
          </Typography.Text>
          {items.map((meta) => (
            <PaletteItem key={meta.name} meta={meta} />
          ))}
        </Flex>
      ))}
    </Flex>
  );
}
