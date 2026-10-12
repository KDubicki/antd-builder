'use client';

import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { useEditorStore } from '@/lib/editor/store';

/** Undo/Redo buttons for page and theme edits. */
export function HistoryActions() {
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <Space.Compact>
      <Button
        icon={<UndoOutlined />}
        aria-label="Undo"
        title="Undo (Ctrl/⌘+Z)"
        disabled={!canUndo}
        onClick={undo}
      />
      <Button
        icon={<RedoOutlined />}
        aria-label="Redo"
        title="Redo (Ctrl/⌘+Shift+Z)"
        disabled={!canRedo}
        onClick={redo}
      />
    </Space.Compact>
  );
}
