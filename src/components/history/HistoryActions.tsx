'use client';

import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { useEditorStore } from '@/lib/editor/store';

/** "Undo Add Button (Ctrl/⌘+Z)", or just the command and keys when there's nothing to undo. */
const hint = (command: string, label: string | undefined, keys: string) =>
  `${command}${label ? ` ${label}` : ''} (${keys})`;

/** Undo/Redo buttons for page and theme edits, naming the step they would take. */
export function HistoryActions() {
  const undoLabel = useEditorStore((state) => state.past.at(-1)?.label);
  const redoLabel = useEditorStore((state) => state.future.at(-1)?.label);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <Space.Compact>
      <Button
        icon={<UndoOutlined />}
        aria-label="Undo"
        title={hint('Undo', undoLabel, 'Ctrl/⌘+Z')}
        disabled={undoLabel === undefined}
        onClick={undo}
      />
      <Button
        icon={<RedoOutlined />}
        aria-label="Redo"
        title={hint('Redo', redoLabel, 'Ctrl/⌘+Shift+Z')}
        disabled={redoLabel === undefined}
        onClick={redo}
      />
    </Space.Compact>
  );
}
