'use client';

import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
  theme,
} from 'antd';
import { ROOT_ID, useEditorStore } from '@/lib/editor/store';
import { type PropDefinition, getComponentMeta } from '@/lib/registry';
import { findNode } from '@/lib/tree';

interface FieldProps {
  id: string;
  def: PropDefinition;
  value: unknown;
  /** `coalesce` marks keystroke-level edits, which undo as one step. */
  onChange: (value: unknown, coalesce?: boolean) => void;
}

/** Editor control for one prop. Clearing a value (empty text, cleared select) removes the prop. */
function PropField({ id, def, value, onChange }: FieldProps) {
  switch (def.type) {
    case 'string': {
      const text = typeof value === 'string' ? value : '';
      const change = (next: string) => onChange(next === '' ? undefined : next, true);
      return def.multiline ? (
        <Input.TextArea
          id={id}
          value={text}
          autoSize={{ minRows: 2, maxRows: 6 }}
          onChange={(e) => change(e.target.value)}
        />
      ) : (
        <Input id={id} value={text} onChange={(e) => change(e.target.value)} />
      );
    }
    case 'number':
      return (
        <InputNumber
          id={id}
          value={typeof value === 'number' ? value : null}
          min={def.min}
          max={def.max}
          style={{ width: '100%' }}
          onChange={(next) => onChange(next ?? undefined, true)}
        />
      );
    case 'boolean':
      return (
        <Switch id={id} checked={value === true} onChange={(next) => onChange(next || undefined)} />
      );
    case 'enum':
      return (
        <Select
          id={id}
          value={value as string | number | undefined}
          allowClear
          placeholder="Default"
          options={def.options.map((option) => ({ value: option, label: String(option) }))}
          onChange={(next) => onChange(next ?? undefined)}
        />
      );
  }
}

export function Inspector() {
  const { token } = theme.useToken();
  const node = useEditorStore((state) =>
    state.selectedId ? findNode(state.root, state.selectedId) : undefined,
  );
  const updateProps = useEditorStore((state) => state.updateProps);
  const removeNode = useEditorStore((state) => state.removeNode);
  const duplicateNode = useEditorStore((state) => state.duplicateNode);
  const meta = node && getComponentMeta(node.component);

  if (!node || !meta) {
    return (
      <Empty
        style={{ marginTop: token.marginXL }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Select a component on the canvas to edit its props"
      />
    );
  }

  const isRoot = node.id === ROOT_ID;

  return (
    <Flex vertical gap="middle" style={{ padding: token.padding }} aria-label="Inspector">
      <Flex justify="space-between" align="start" gap="small">
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {isRoot ? 'Page' : meta.label}
          </Typography.Title>
          <Typography.Text type="secondary">{meta.description}</Typography.Text>
        </div>
        {!isRoot && (
          <Flex gap="small">
            <Button
              icon={<CopyOutlined />}
              aria-label="Duplicate component"
              title="Duplicate (Ctrl/⌘+D)"
              onClick={() => duplicateNode(node.id)}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              aria-label="Delete component"
              onClick={() => removeNode(node.id)}
            />
          </Flex>
        )}
      </Flex>
      {/* Keyed by node so uncontrolled internals (e.g. number drafts) reset on selection change. */}
      <Form key={node.id} layout="vertical" component="div">
        {Object.entries(meta.props).map(([key, def]) => {
          const id = `prop-${key}`;
          return (
            <Form.Item
              key={key}
              label={def.label}
              htmlFor={id}
              style={{ marginBottom: token.marginSM }}
            >
              <PropField
                id={id}
                def={def}
                value={node.props[key]}
                onChange={(value, coalesce) => updateProps(node.id, { [key]: value }, { coalesce })}
              />
            </Form.Item>
          );
        })}
      </Form>
    </Flex>
  );
}
