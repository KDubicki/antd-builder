import 'server-only';

export interface RateLimitOptions {
  /** Requests allowed per client within a window. */
  limit: number;
  windowMs: number;
  now?: () => number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Requests per client per minute on the routes that cost the server something: outbound
 * fetches, disk writes, CPU for archives, paid model calls.
 */
export const LIMITS_PER_MINUTE = {
  aiComponent: 10,
  dataFetch: 30,
  export: 20,
  share: 10,
} as const;

/** A limiter for one of the routes in `LIMITS_PER_MINUTE`. */
export const routeLimiter = (route: keyof typeof LIMITS_PER_MINUTE) =>
  createRateLimiter({ limit: LIMITS_PER_MINUTE[route], windowMs: 60_000 });

/** Clients tracked before expired windows are swept, bounding memory. */
const SWEEP_AT = 10_000;

/**
 * Fixed-window request counter per client key, kept in memory: limits are per server
 * instance, which is enough to stop a single client from hammering the expensive routes.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions) {
  const windows = new Map<string, { start: number; count: number }>();

  return function check(key: string): RateLimitResult {
    const time = now();
    if (windows.size >= SWEEP_AT) {
      for (const [k, window] of windows) if (time - window.start >= windowMs) windows.delete(k);
    }
    const window = windows.get(key);
    if (!window || time - window.start >= windowMs) {
      windows.set(key, { start: time, count: 1 });
      return { ok: true };
    }
    if (window.count < limit) {
      window.count += 1;
      return { ok: true };
    }
    return { ok: false, retryAfterSeconds: Math.ceil((window.start + windowMs - time) / 1000) };
  };
}

/**
 * The client's address, as the first proxy reported it. Without a proxy in front that rewrites
 * `X-Forwarded-For`, clients can set it themselves; the limit is then per claimed address.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

/** A 429 response when the request's client is over the limit, otherwise `null`. */
export function rateLimit(
  request: Request,
  check: (key: string) => RateLimitResult,
): Response | null {
  const result = check(clientKey(request));
  if (result.ok) return null;
  return Response.json(
    { error: `Too many requests. Try again in ${result.retryAfterSeconds} s.` },
    { status: 429, headers: { 'retry-after': String(result.retryAfterSeconds) } },
  );
}
