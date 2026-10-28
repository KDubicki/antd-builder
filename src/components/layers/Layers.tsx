'use client';

import { MinusSquareOutlined, PlusSquareOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Dropdown, Empty, Flex, Input, Space, Tree, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { useNodeMenu } from '@/components/commandMenu';
import { Highlight } from '@/components/Highlight';
import { useEditorStore } from '@/lib/editor/store';
import {
  type LayerNode,
  collapsibleIds,
  expandedIds,
  filterLayers,
  toLayerTree,
} from './layerTree';

/**
 * A layer's label, with the same right-click menu as its component on the canvas. Pointing at it
 * outlines the component on the canvas. Filter matches are marked.
 */
function LayerTitle({ node, query }: { node: LayerNode; query: string }) {
  const menu = useNodeMenu(node.key);
  return (
    <Dropdown trigger={['contextMenu']} menu={menu}>
      <span
        onContextMenu={() => useEditorStore.getState().select(node.key)}
        onMouseEnter={() => useEditorStore.getState().hover(node.key)}
        onMouseLeave={() => useEditorStore.getState().hover(null)}
      >
        <span>
          <Highlight text={node.label} query={query} />
        </span>
        {node.hint && (
          <Typography.Text type="secondary" style={{ marginInlineStart: 6 }}>
            <Highlight text={node.hint} query={query} />
          </Typography.Text>
        )}
      </span>
    </Dropdown>
  );
}

/**
 * Outline of the page. Clicking a layer selects its node, which helps with nested or
 * hard-to-click components, and right-clicking one opens its commands. Everything starts
 * expanded, and the selection is always revealed. The filter narrows the outline to matching
 * layers, and the buttons beside it collapse or expand every layer at once.
 */
export function Layers() {
  const { token } = theme.useToken();
  const root = useEditorStore((state) => state.root);
  const selectedId = useEditorStore((state) => state.selectedId);
  const select = useEditorStore((state) => state.select);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterLayers(toLayerTree(root), query), [root, query]);
  const expandedKeys = useMemo(
    () => expandedIds(root, selectedId, collapsed),
    [root, selectedId, collapsed],
  );
  const collapsible = useMemo(() => collapsibleIds(root), [root]);
  const allCollapsed = collapsible.every((id) => collapsed.has(id));
  const noneCollapsed = collapsible.every((id) => !collapsed.has(id));

  // A new filter starts fully expanded, so no match hides in a collapsed layer.
  const filter = (next: string) => {
    setQuery(next);
    setCollapsed(new Set());
  };

  return (
    <Flex vertical gap="small" style={{ padding: token.padding }} aria-label="Layers">
      <Flex gap="small">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Filter layers"
          aria-label="Filter layers"
          value={query}
          onChange={(event) => filter(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && filter('')}
        />
        <Space.Compact>
          <Button
            icon={<MinusSquareOutlined />}
            aria-label="Collapse all layers"
            title="Collapse all layers"
            disabled={allCollapsed}
            onClick={() => setCollapsed(new Set(collapsible))}
          />
          <Button
            icon={<PlusSquareOutlined />}
            aria-label="Expand all layers"
            title="Expand all layers"
            disabled={noneCollapsed}
            onClick={() => setCollapsed(new Set())}
          />
        </Space.Compact>
      </Flex>
      {!filtered && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No layers match" />}
      <Tree<LayerNode>
        blockNode
        showLine
        treeData={filtered ? [filtered] : []}
        titleRender={(node) => <LayerTitle node={node} query={query} />}
        selectedKeys={selectedId ? [selectedId] : []}
        expandedKeys={expandedKeys}
        onExpand={(_keys, { node, expanded }) => {
          const next = new Set(collapsed);
          if (expanded) next.delete(node.key);
          else next.add(node.key);
          setCollapsed(next);
        }}
        // Clicking the selected layer again keeps it selected rather than toggling it off.
        onSelect={(_keys, { node }) => select(node.key)}
      />
    </Flex>
  );
}
