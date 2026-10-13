'use client';

import { DisconnectOutlined, LinkOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Flex, Select, Space, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { type DataBinding, compatiblePaths, isBinding, resolveBinding } from '@/lib/mockData';
import type { PropDefinition } from '@/lib/registry';
import type { DataSource } from '@/lib/schema';

const PREVIEW_MAX = 60;

function preview(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX - 1)}…` : text;
}

/**
 * A binding to `source`, at the first path whose value fits the prop, preferring values that
 * fit as they are over numbers shown as text.
 */
export function defaultBinding(
  source: DataSource,
  def: PropDefinition,
  sources: readonly DataSource[],
): DataBinding {
  const paths = compatiblePaths(source, def, sources);
  const exact = paths.find((path) => {
    const resolution = resolveBinding({ $data: source.id, path }, def, sources);
    return resolution.ok && !resolution.converted;
  });
  const path = exact ?? paths[0] ?? '';
  return path ? { $data: source.id, path } : { $data: source.id };
}

interface BindingFieldProps {
  id: string;
  def: PropDefinition;
  binding: DataBinding;
  onChange: (value: DataBinding, coalesce?: boolean) => void;
}

/** Data source picker, path (with suggestions that fit the prop) and the resolved value. */
function BindingField({ id, def, binding, onChange }: BindingFieldProps) {
  const { token } = theme.useToken();
  const sources = useEditorStore((state) => state.mockData);
  const source = sources.find((candidate) => candidate.id === binding.$data);
  const resolution = resolveBinding(binding, def, sources);
  const path = binding.path ?? '';
  const suggestions = source
    ? compatiblePaths(source, def, sources).filter(
        (option) => option !== '' && option.includes(path),
      )
    : [];

  return (
    <Flex vertical gap={4}>
      <Space.Compact block>
        <Select
          id={id}
          aria-label={`${def.label} data source`}
          value={source?.id}
          placeholder="Data source"
          status={source ? undefined : 'error'}
          style={{ width: '45%' }}
          options={sources.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          onChange={(next: string) => {
            const picked = sources.find((candidate) => candidate.id === next);
            if (picked) onChange(defaultBinding(picked, def, sources));
          }}
        />
        <AutoComplete
          aria-label={`${def.label} path`}
          value={path}
          placeholder="Whole response"
          style={{ width: '55%' }}
          options={suggestions.map((option) => ({ value: option }))}
          onChange={(next: string) => {
            const trimmed = next.trim();
            onChange(
              trimmed ? { $data: binding.$data, path: trimmed } : { $data: binding.$data },
              true,
            );
          }}
        />
      </Space.Compact>
      <Typography.Text
        type={resolution.ok ? 'secondary' : 'danger'}
        style={{ fontSize: token.fontSizeSM }}
        ellipsis
        aria-live="polite"
      >
        {resolution.ok ? `= ${preview(resolution.value)}` : resolution.error}
      </Typography.Text>
    </Flex>
  );
}

interface BindableFieldProps {
  id: string;
  def: PropDefinition;
  value: unknown;
  onChange: (value: unknown, coalesce?: boolean) => void;
  /** The literal editor for the prop, shown while it isn't bound. */
  children: ReactNode;
}

/**
 * A prop editor that can switch to reading from mock data. The bind button only shows once the
 * project has data sources (or the prop is already bound).
 */
export function BindableField({ id, def, value, onChange, children }: BindableFieldProps) {
  const sources = useEditorStore((state) => state.mockData);
  const bound = isBinding(value);
  if (!bound && sources.length === 0) return children;

  return (
    <Flex gap={4} align="start">
      <div style={{ flex: 1, minWidth: 0 }}>
        {bound ? <BindingField id={id} def={def} binding={value} onChange={onChange} /> : children}
      </div>
      {bound ? (
        <Button
          type="text"
          icon={<DisconnectOutlined />}
          aria-label={`Unbind ${def.label}`}
          title="Stop using mock data"
          onClick={() => onChange(undefined)}
        />
      ) : (
        <Button
          type="text"
          icon={<LinkOutlined />}
          aria-label={`Bind ${def.label} to mock data`}
          title="Use mock data"
          onClick={() => onChange(defaultBinding(sources[0]!, def, sources))}
        />
      )}
    </Flex>
  );
}
