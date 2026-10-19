'use client';

import { Button, ColorPicker, Flex, Form, InputNumber, Segmented, Switch, theme } from 'antd';
import { useEditorStore } from '@/lib/editor/store';
import type { ProjectTheme } from '@/lib/schema';
import {
  type ThemePreset,
  type ThemeTokenDefinition,
  defaultTokenValue,
  matchingPreset,
  themePresets,
  themeTokens,
} from '@/lib/theme';

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

/** A preset's colors at a glance: its primary color on its background. */
function Swatch({ preset }: { preset: ThemePreset }) {
  const { token } = theme.useToken();
  const primary = String(preset.theme.token.colorPrimary ?? defaultTokenValue('colorPrimary'));
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: primary,
        boxShadow: `0 0 0 2px ${preset.theme.mode === 'dark' ? '#141414' : token.colorBgContainer}`,
      }}
    />
  );
}

/** One-click starting points; the active one (if the theme still matches it) is highlighted. */
function ThemePresets() {
  const current = useEditorStore((state) => matchingPreset(state.theme)?.id);
  const applyTheme = useEditorStore((state) => state.applyTheme);
  return (
    <Flex wrap gap="small" role="group" aria-label="Theme presets">
      {themePresets.map((preset) => (
        <Button
          key={preset.id}
          size="small"
          type={preset.id === current ? 'primary' : 'default'}
          ghost={preset.id === current}
          aria-pressed={preset.id === current}
          icon={<Swatch preset={preset} />}
          onClick={() => applyTheme(preset.theme, `Apply ${preset.label} theme`)}
        >
          {preset.label}
        </Button>
      ))}
    </Flex>
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
        <Form.Item label="Presets" style={{ marginBottom: token.marginSM }}>
          <ThemePresets />
        </Form.Item>
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
