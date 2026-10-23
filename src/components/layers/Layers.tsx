'use client';

import { SearchOutlined } from '@ant-design/icons';
import { Dropdown, Empty, Flex, Input, Tree, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { useNodeMenu } from '@/components/commandMenu';
import { useEditorStore } from '@/lib/editor/store';
import { type LayerNode, expandedIds, filterLayers, toLayerTree } from './layerTree';

/**
 * A layer's label, with the same right-click menu as its component on the canvas. Pointing at it
 * outlines the component on the canvas.
 */
function LayerTitle({ node }: { node: LayerNode }) {
  const menu = useNodeMenu(node.key);
  return (
    <Dropdown trigger={['contextMenu']} menu={menu}>
      <span
        onContextMenu={() => useEditorStore.getState().select(node.key)}
        onMouseEnter={() => useEditorStore.getState().hover(node.key)}
        onMouseLeave={() => useEditorStore.getState().hover(null)}
      >
        <span>{node.label}</span>
        {node.hint && (
          <Typography.Text type="secondary" style={{ marginInlineStart: 6 }}>
            {node.hint}
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
 * layers.
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

  // A new filter starts fully expanded, so no match hides in a collapsed layer.
  const filter = (next: string) => {
    setQuery(next);
    setCollapsed(new Set());
  };

  return (
    <Flex vertical gap="small" style={{ padding: token.padding }} aria-label="Layers">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Filter layers"
        aria-label="Filter layers"
        value={query}
        onChange={(event) => filter(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && filter('')}
      />
      {!filtered && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No layers match" />}
      <Tree<LayerNode>
        blockNode
        showLine
        treeData={filtered ? [filtered] : []}
        titleRender={(node) => <LayerTitle node={node} />}
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
