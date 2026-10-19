'use client';

import { BorderOuterOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
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
import { JsonEditor } from '@/components/JsonEditor';
import {
  type NodeCommand,
  commandTitle,
  nodeCommands,
  wrapCommands,
} from '@/components/nodeCommands';
import { BindableField } from './DataBinding';
import { SaveBlockButton } from './SaveBlockButton';
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
      return <JsonEditor id={id} value={value} onChange={onChange} />;
  }
}

/** Icon button running a node command, disabled while it can't run. */
function CommandButton({ command, nodeId }: { command: NodeCommand; nodeId: string }) {
  const enabled = useEditorStore((state) => command.enabled(state, nodeId));
  return (
    <Button
      danger={command.danger}
      icon={command.icon}
      aria-label={command.name}
      title={commandTitle(command)}
      disabled={!enabled}
      onClick={() => command.run(useEditorStore.getState(), nodeId)}
    />
  );
}

/** Menu to put the component in a container, or take it out of one. */
function WrapMenu({ nodeId }: { nodeId: string }) {
  const commands = [...Object.values(wrapCommands), nodeCommands.unwrap];
  // Re-evaluated when the page changes, so the menu reflects what's allowed now.
  const enabled = useEditorStore((state) =>
    commands.map((command) => command.enabled(state, nodeId)).join(),
  ).split(',');
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: commands.map((command, i) => ({
          key: command.label,
          label: command.label,
          icon: command.icon,
          extra: command.keys?.join('+'),
          disabled: enabled[i] !== 'true',
        })),
        onClick: ({ key }) =>
          commands.find((command) => command.label === key)?.run(useEditorStore.getState(), nodeId),
      }}
    >
      <Button icon={<BorderOuterOutlined />} aria-label="Wrap or unwrap" title="Wrap or unwrap" />
    </Dropdown>
  );
}

export function Inspector() {
  const { token } = theme.useToken();
  const node = useEditorStore((state) =>
    state.selectedId ? findNode(state.root, state.selectedId) : undefined,
  );
  const updateProps = useEditorStore((state) => state.updateProps);
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
      {/* The description sits below the actions so it can use the panel's full width. */}
      <div>
        <Flex justify="space-between" align="center" gap="small">
          <Typography.Title level={5} style={{ margin: 0 }}>
            {isRoot ? 'Page' : meta.label}
          </Typography.Title>
          {!isRoot && (
            <Flex gap="small">
              <Space.Compact>
                <CommandButton command={nodeCommands.moveUp} nodeId={node.id} />
                <CommandButton command={nodeCommands.moveDown} nodeId={node.id} />
              </Space.Compact>
              <WrapMenu nodeId={node.id} />
              <SaveBlockButton nodeId={node.id} defaultName={meta.label} />
              <CommandButton command={nodeCommands.duplicate} nodeId={node.id} />
              <CommandButton command={nodeCommands.delete} nodeId={node.id} />
            </Flex>
          )}
        </Flex>
        <Typography.Text type="secondary">{meta.description}</Typography.Text>
      </div>
      {/* Keyed by node so uncontrolled internals (e.g. number drafts) reset on selection change. */}
      <Form key={node.id} layout="vertical" component="div">
        {Object.entries(meta.props).map(([key, def]) => {
          const id = `prop-${key}`;
          const onChange = (value: unknown, coalesce?: boolean) =>
            updateProps(node.id, { [key]: value }, { coalesce });
          return (
            <Form.Item
              key={key}
              label={def.label}
              htmlFor={id}
              style={{ marginBottom: token.marginSM }}
            >
              <BindableField id={id} def={def} value={node.props[key]} onChange={onChange}>
                <PropField id={id} def={def} value={node.props[key]} onChange={onChange} />
              </BindableField>
            </Form.Item>
          );
        })}
      </Form>
    </Flex>
  );
}
