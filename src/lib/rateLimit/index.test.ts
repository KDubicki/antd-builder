// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { clientKey, createRateLimiter, rateLimit } from '.';

const clock = (start = 0) => {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe('createRateLimiter', () => {
  it('allows up to the limit per window, per client', () => {
    const time = clock();
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });
    expect(check('a')).toEqual({ ok: true });
    expect(check('a')).toEqual({ ok: true });
    time.advance(15_500);
    expect(check('a')).toEqual({ ok: false, retryAfterSeconds: 45 });
    expect(check('b')).toEqual({ ok: true });

    time.advance(44_500); // the window is over
    expect(check('a')).toEqual({ ok: true });
  });

  it('forgets expired clients once many are tracked', () => {
    const time = clock();
    const check = createRateLimiter({ limit: 1, windowMs: 1000, now: time.now });
    for (let i = 0; i < 10_000; i += 1) check(`client${i}`);
    expect(check('client0')).toMatchObject({ ok: false });
    time.advance(1000);
    check('new'); // sweeps the expired windows
    expect(check('client0')).toEqual({ ok: true });
  });
});

describe('clientKey', () => {
  const request = (headers: Record<string, string>) => new Request('http://x', { headers });

  it('uses the first forwarded address, then X-Real-IP', () => {
    expect(clientKey(request({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientKey(request({ 'x-real-ip': '203.0.113.8' }))).toBe('203.0.113.8');
    expect(clientKey(request({}))).toBe('unknown');
  });
});

describe('rateLimit', () => {
  it('answers 429 with Retry-After once a client is over the limit', async () => {
    const check = createRateLimiter({ limit: 1, windowMs: 30_000, now: () => 0 });
    const request = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9' } });
    expect(rateLimit(request, check)).toBeNull();
    const response = rateLimit(request, check)!;
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(await response.json()).toEqual({ error: 'Too many requests. Try again in 30 s.' });
  });
});
