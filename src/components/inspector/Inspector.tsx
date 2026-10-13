'use client';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd';
import { useState } from 'react';
import { ROOT_ID, useEditorStore } from '@/lib/editor/store';
import { type PropDefinition, getComponentMeta } from '@/lib/registry';
import { findNode, siblingPosition } from '@/lib/tree';

interface FieldProps {
  id: string;
  def: PropDefinition;
  value: unknown;
  /** `coalesce` marks keystroke-level edits, which undo as one step. */
  onChange: (value: unknown, coalesce?: boolean) => void;
}

/**
 * JSON editor for structured props. Valid JSON is applied while typing; invalid JSON is flagged
 * and kept as a draft without touching the node. Blurring a valid draft reformats it.
 */
function JsonField({ id, value, onChange }: Omit<FieldProps, 'def'>) {
  const { token } = theme.useToken();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const text = draft ?? (value === undefined ? '' : JSON.stringify(value, null, 2));

  const change = (next: string) => {
    setDraft(next);
    if (next.trim() === '') {
      setInvalid(false);
      onChange(undefined, true);
      return;
    }
    try {
      onChange(JSON.parse(next), true);
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <Input.TextArea
      id={id}
      value={text}
      status={invalid ? 'error' : undefined}
      aria-invalid={invalid}
      placeholder="JSON"
      autoSize={{ minRows: 3, maxRows: 12 }}
      spellCheck={false}
      style={{ fontFamily: token.fontFamilyCode, fontSize: token.fontSizeSM }}
      onChange={(e) => change(e.target.value)}
      onBlur={() => !invalid && setDraft(null)}
    />
  );
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
        <Switch
          id={id}
          checked={typeof value === 'boolean' ? value : (def.default ?? false)}
          onChange={(next) => onChange(next === (def.default ?? false) ? undefined : next)}
        />
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
    case 'json':
      return <JsonField id={id} value={value} onChange={onChange} />;
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
  const nudgeNode = useEditorStore((state) => state.nudgeNode);
  // Primitives, so the selectors stay stable between renders.
  const index = useEditorStore((state) =>
    state.selectedId ? (siblingPosition(state.root, state.selectedId)?.index ?? -1) : -1,
  );
  const siblings = useEditorStore((state) =>
    state.selectedId ? (siblingPosition(state.root, state.selectedId)?.count ?? 0) : 0,
  );
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
            <Space.Compact>
              <Button
                icon={<ArrowUpOutlined />}
                aria-label="Move up"
                title="Move up (Alt+↑)"
                disabled={index <= 0}
                onClick={() => nudgeNode(node.id, -1)}
              />
              <Button
                icon={<ArrowDownOutlined />}
                aria-label="Move down"
                title="Move down (Alt+↓)"
                disabled={index < 0 || index >= siblings - 1}
                onClick={() => nudgeNode(node.id, 1)}
              />
            </Space.Compact>
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
