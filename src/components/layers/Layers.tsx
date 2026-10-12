'use client';

import { Flex, Tree, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { type LayerNode, expandedIds, toLayerTree } from './layerTree';

function LayerTitle({ node }: { node: LayerNode }) {
  return (
    <span>
      <span>{node.label}</span>
      {node.hint && (
        <Typography.Text type="secondary" style={{ marginInlineStart: 6 }}>
          {node.hint}
        </Typography.Text>
      )}
    </span>
  );
}

/**
 * Outline of the page. Clicking a layer selects its node, which helps with nested or
 * hard-to-click components. Everything starts expanded, and the selection is always revealed.
 */
export function Layers() {
  const { token } = theme.useToken();
  const root = useEditorStore((state) => state.root);
  const selectedId = useEditorStore((state) => state.selectedId);
  const select = useEditorStore((state) => state.select);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const treeData = useMemo(() => [toLayerTree(root)], [root]);
  const expandedKeys = useMemo(
    () => expandedIds(root, selectedId, collapsed),
    [root, selectedId, collapsed],
  );

  return (
    <Flex vertical style={{ padding: token.padding }} aria-label="Layers">
      <Tree<LayerNode>
        blockNode
        showLine
        treeData={treeData}
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
