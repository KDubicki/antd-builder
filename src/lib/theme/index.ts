import { type ThemeConfig, theme } from 'antd';
import type { ProjectTheme } from '@/lib/schema';

export function createTheme(): ProjectTheme {
  return { mode: 'light', compact: false, token: {} };
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
