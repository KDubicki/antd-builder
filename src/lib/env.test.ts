import { afterEach, describe, expect, it, vi } from 'vitest';
import { getServerEnv } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('getServerEnv', () => {
  it('throws when GEMINI_API_KEY is missing', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(() => getServerEnv()).toThrow(/GEMINI_API_KEY/);
  });

  it('applies the default model', () => {
    vi.stubEnv('GEMINI_API_KEY', 'key');
    vi.stubEnv('GEMINI_MODEL', undefined);
    expect(getServerEnv()).toEqual({ GEMINI_API_KEY: 'key', GEMINI_MODEL: 'gemini-3.8-flash' });
  });
});
