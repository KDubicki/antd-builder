'use client';

import { useDraggable } from '@dnd-kit/core';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, Empty, Flex, Input, Popconfirm, Typography, theme } from 'antd';
import { type KeyboardEvent, useState } from 'react';
import { addAtSelection } from '@/components/dragDrop';
import { blocks } from '@/lib/blocks';
import type { DragData } from '@/lib/editor/drop';
import { useEditorStore } from '@/lib/editor/store';
import {
  type ComponentCategory,
  type ComponentMeta,
  categoryLabels,
  components,
  getComponentMeta,
} from '@/lib/registry';

const CUSTOM_BLOCK_DESCRIPTION = 'Your saved block';

interface PaletteItemProps {
  id: string;
  label: string;
  description: string;
  data: DragData;
}

/** Why a component has no place near the selection, e.g. "A Column goes inside a Row". */
function noPlaceMessage(label: string, component: string): string {
  const parents = getComponentMeta(component)?.parents;
  if (!parents) return `There's no place for ${label} here`;
  const names = parents.map((name) => getComponentMeta(name)?.label ?? name);
  return `${label} goes inside ${names.join(' or ')}: select one first`;
}

function PaletteItem({ id, label, description, data }: PaletteItemProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, data });

  const add = () => {
    if (!addAtSelection(data)) message.warning(noPlaceMessage(label, data.component));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); // Space would scroll the palette
    add();
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={add}
      onKeyDown={onKeyDown}
      title={description}
      style={{
        flex: 1,
        minWidth: 0,
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
      {label}
    </div>
  );
}

/** What palette search looks at: a component's or a block's label, name and description. */
interface Searchable {
  label: string;
  name?: string;
  description: string;
}

/**
 * Whether an item matches a palette search: every whitespace-separated term must appear in its
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
  const matchingBlocks = blocks.filter((block) => matchesQuery(block, query));
  const customBlocks = useEditorStore((state) => state.customBlocks);
  const removeCustomBlock = useEditorStore((state) => state.removeCustomBlock);
  const matchingCustom = customBlocks.filter((block) =>
    matchesQuery({ label: block.name, description: CUSTOM_BLOCK_DESCRIPTION }, query),
  );

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
      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
        Drag onto the canvas, or click to add next to the selection.
      </Typography.Text>
      {groups.length === 0 && matchingBlocks.length === 0 && matchingCustom.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No components match" />
      )}
      {matchingCustom.length > 0 && (
        <Flex vertical gap="small">
          <Typography.Text type="secondary" strong>
            My blocks
          </Typography.Text>
          {matchingCustom.map((block) => (
            <Flex key={block.id} gap={4} align="center">
              <PaletteItem
                id={`block:${block.id}`}
                label={block.name}
                description={CUSTOM_BLOCK_DESCRIPTION}
                data={{ type: 'block', block: block.id, component: block.root.component }}
              />
              <Popconfirm
                title={`Delete "${block.name}"?`}
                description="Copies already on the page stay."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => removeCustomBlock(block.id)}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={`Delete block ${block.name}`}
                />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      )}
      {matchingBlocks.length > 0 && (
        <Flex vertical gap="small">
          <Typography.Text type="secondary" strong>
            Blocks
          </Typography.Text>
          {matchingBlocks.map((block) => (
            <PaletteItem
              key={block.id}
              id={`block:${block.id}`}
              label={block.label}
              description={block.description}
              data={{ type: 'block', block: block.id, component: block.component }}
            />
          ))}
        </Flex>
      )}
      {groups.map(({ category, items }) => (
        <Flex key={category} vertical gap="small">
          <Typography.Text type="secondary" strong>
            {categoryLabels[category]}
          </Typography.Text>
          {items.map((meta) => (
            <PaletteItem
              key={meta.name}
              id={`palette:${meta.name}`}
              label={meta.label}
              description={meta.description}
              data={{ type: 'palette', component: meta.name }}
            />
          ))}
        </Flex>
      ))}
    </Flex>
  );
}
