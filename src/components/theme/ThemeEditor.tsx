'use client';

import { Button, ColorPicker, Flex, Form, InputNumber, Segmented, Switch, theme } from 'antd';
import { useEditorStore } from '@/lib/editor/store';
import type { ProjectTheme } from '@/lib/schema';
import { type ThemeTokenDefinition, defaultTokenValue, themeTokens } from '@/lib/theme';

function TokenField({ def, id }: { def: ThemeTokenDefinition; id: string }) {
  const value = useEditorStore((state) => state.theme.token[def.key]);
  const setThemeToken = useEditorStore((state) => state.setThemeToken);
  const fallback = defaultTokenValue(def.key);

  if (def.type === 'color') {
    return (
      <ColorPicker
        value={String(value ?? fallback)}
        disabledAlpha
        showText
        format="hex"
        onChange={(color) => setThemeToken(def.key, color.toHexString())}
      />
    );
  }
  return (
    <InputNumber
      id={id}
      value={typeof value === 'number' ? value : null}
      placeholder={String(fallback)}
      min={def.min}
      max={def.max}
      style={{ width: '100%' }}
      onChange={(next) => setThemeToken(def.key, next ?? undefined)}
    />
  );
}

/** Edits the project theme; the canvas previews it live. */
export function ThemeEditor() {
  const { token } = theme.useToken();
  const mode = useEditorStore((state) => state.theme.mode);
  const compact = useEditorStore((state) => state.theme.compact);
  const setThemeMode = useEditorStore((state) => state.setThemeMode);
  const setCompact = useEditorStore((state) => state.setCompact);
  const resetTheme = useEditorStore((state) => state.resetTheme);

  return (
    <Flex vertical style={{ padding: token.padding }} aria-label="Theme editor">
      <Form layout="vertical" component="div">
        <Form.Item label="Color mode" style={{ marginBottom: token.marginSM }}>
          <Segmented<ProjectTheme['mode']>
            block
            value={mode}
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            onChange={(next) => setThemeMode(next)}
          />
        </Form.Item>
        <Form.Item label="Compact" htmlFor="theme-compact" style={{ marginBottom: token.marginSM }}>
          <Switch id="theme-compact" checked={compact} onChange={setCompact} />
        </Form.Item>
        {themeTokens.map((def) => {
          const id = `theme-${def.key}`;
          return (
            <Form.Item
              key={def.key}
              label={def.label}
              htmlFor={def.type === 'number' ? id : undefined}
              style={{ marginBottom: token.marginSM }}
            >
              <TokenField def={def} id={id} />
            </Form.Item>
          );
        })}
      </Form>
      <Button onClick={resetTheme}>Reset theme</Button>
    </Flex>
  );
}
