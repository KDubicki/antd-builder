import { theme } from 'antd';
import { describe, expect, it } from 'vitest';
import { projectThemeSchema } from '@/lib/schema';
import { algorithmNames, createTheme, defaultTokenValue, themeTokens, toThemeConfig } from '.';

describe('theme', () => {
  it('creates a valid default theme', () => {
    expect(projectThemeSchema.parse(createTheme())).toEqual({
      mode: 'light',
      compact: false,
      token: {},
    });
  });

  it('uses the default algorithm for a plain light theme', () => {
    expect(toThemeConfig(createTheme())).toEqual({ token: {}, algorithm: theme.defaultAlgorithm });
  });

  it('combines dark and compact algorithms and passes tokens through', () => {
    const config = toThemeConfig({ mode: 'dark', compact: true, token: { borderRadius: 2 } });
    expect(config.algorithm).toEqual([theme.darkAlgorithm, theme.compactAlgorithm]);
    expect(config.token).toEqual({ borderRadius: 2 });
    expect(algorithmNames({ mode: 'light', compact: true, token: {} })).toEqual([
      'compactAlgorithm',
    ]);
  });

  it('applies token overrides to the derived design tokens', () => {
    const token = theme.getDesignToken(
      toThemeConfig({ mode: 'light', compact: false, token: { colorPrimary: '#722ed1' } }),
    );
    expect(token.colorPrimary).toBe('#722ed1');
  });

  it('knows antd defaults for every editable token', () => {
    for (const def of themeTokens) {
      const value = defaultTokenValue(def.key);
      expect(typeof value, def.key).toBe(def.type === 'color' ? 'string' : 'number');
    }
    expect(defaultTokenValue('nope')).toBeUndefined();
  });
});
