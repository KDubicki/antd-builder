/** Builds the Content-Security-Policy header for a request with the given nonce. */
export function buildCsp(nonce: string, { isDev = false } = {}): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Only scripts carrying this request's nonce (and what they load) may run.
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // antd and React emit inline `style` attributes, which nonces cannot cover. A nonce here
    // would also make browsers ignore 'unsafe-inline', so styles intentionally stay without one.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!isDev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}
