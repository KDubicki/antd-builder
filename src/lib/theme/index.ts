import { type ThemeConfig, theme } from 'antd';
import type { ProjectTheme } from '@/lib/schema';

export function createTheme(): ProjectTheme {
  return { mode: 'light', compact: false, token: {} };
}

export interface ThemePreset {
  id: string;
  label: string;
  theme: ProjectTheme;
}

const preset = (
  id: string,
  label: string,
  token: ProjectTheme['token'],
  options: Partial<Omit<ProjectTheme, 'token'>> = {},
): ThemePreset => ({ id, label, theme: { ...createTheme(), ...options, token } });

/** Starting points for a project theme, applied as a whole and then fine-tuned. */
export const themePresets: readonly ThemePreset[] = [
  preset('default', 'antd default', {}),
  preset('ocean', 'Ocean', { colorPrimary: '#0e7490', colorInfo: '#0e7490', borderRadius: 8 }),
  preset('forest', 'Forest', { colorPrimary: '#2f7d32', colorInfo: '#2f7d32', borderRadius: 4 }),
  preset('sunset', 'Sunset', { colorPrimary: '#e8590c', colorInfo: '#e8590c', borderRadius: 12 }),
  preset('grape', 'Grape', { colorPrimary: '#7048e8', colorInfo: '#7048e8', borderRadius: 10 }),
  preset(
    'midnight',
    'Midnight',
    { colorPrimary: '#4c6ef5', colorInfo: '#4c6ef5', borderRadius: 8 },
    { mode: 'dark' },
  ),
  preset(
    'slate',
    'Slate compact',
    { colorPrimary: '#475569', colorInfo: '#475569', borderRadius: 2 },
    { compact: true },
  ),
];

/** The preset `projectTheme` matches exactly, if any. */
export function matchingPreset(projectTheme: ProjectTheme): ThemePreset | undefined {
  const key = (t: ProjectTheme) =>
    JSON.stringify([t.mode, t.compact, Object.entries(t.token).sort()]);
  return themePresets.find((candidate) => key(candidate.theme) === key(projectTheme));
}

export type ThemeTokenDefinition =
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'number'; min: number; max: number };

/** Seed tokens editable in the theme panel. Every other token derives from these. */
export const themeTokens: readonly ThemeTokenDefinition[] = [
  { key: 'colorPrimary', label: 'Primary color', type: 'color' },
  { key: 'colorSuccess', label: 'Success color', type: 'color' },
  { key: 'colorWarning', label: 'Warning color', type: 'color' },
  { key: 'colorError', label: 'Error color', type: 'color' },
  { key: 'colorInfo', label: 'Info color', type: 'color' },
  { key: 'borderRadius', label: 'Border radius', type: 'number', min: 0, max: 32 },
  { key: 'fontSize', label: 'Font size', type: 'number', min: 10, max: 24 },
];

/** antd's default value for a seed token, shown when the project doesn't override it. */
export function defaultTokenValue(key: string): string | number | undefined {
  const value = (theme.defaultSeed as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

/** Names of the antd algorithms a theme uses, in the order they apply. */
export function algorithmNames(
  projectTheme: ProjectTheme,
): ('darkAlgorithm' | 'compactAlgorithm')[] {
  return [
    ...(projectTheme.mode === 'dark' ? (['darkAlgorithm'] as const) : []),
    ...(projectTheme.compact ? (['compactAlgorithm'] as const) : []),
  ];
}

export function toThemeConfig(projectTheme: ProjectTheme): ThemeConfig {
  const algorithms = algorithmNames(projectTheme).map((name) => theme[name]);
  return {
    token: projectTheme.token,
    algorithm: algorithms.length > 0 ? algorithms : theme.defaultAlgorithm,
  };
}
