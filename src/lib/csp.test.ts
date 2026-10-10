import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp';

describe('buildCsp', () => {
  it('allows only nonce-bearing scripts in production', () => {
    const csp = buildCsp('abc123');
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('keeps nonces out of style-src so unsafe-inline stays effective', () => {
    expect(buildCsp('abc123')).toMatch(/style-src 'self' 'unsafe-inline'(;|$)/);
  });

  it('relaxes eval and websockets for development only', () => {
    const csp = buildCsp('abc123', { isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
