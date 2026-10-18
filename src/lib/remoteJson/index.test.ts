// @vitest-environment node
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_RESPONSE_BYTES, RemoteJsonError, fetchJson, isPublicAddress } from '.';

let server: Server;
let base: string;
const allowAll = { isAllowedAddress: () => true };

beforeAll(async () => {
  server = createServer((req, res) => {
    const send = (status: number, body: string, headers: Record<string, string> = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(body);
    };
    switch (req.url) {
      case '/users':
        return send(200, JSON.stringify([{ name: 'Ada' }]));
      case '/accept':
        return send(200, JSON.stringify(req.headers.accept));
      case '/missing':
        return send(404, '{}');
      case '/html':
        return send(200, '<html></html>', { 'content-type': 'text/html' });
      case '/big':
        return send(200, `"${'x'.repeat(MAX_RESPONSE_BYTES)}"`);
      case '/big-chunked': {
        res.writeHead(200);
        res.write(`"${'x'.repeat(MAX_RESPONSE_BYTES / 2)}`);
        res.write('x'.repeat(MAX_RESPONSE_BYTES / 2));
        return res.end('"');
      }
      case '/redirect':
        return send(302, '', { location: '/users' });
      case '/loop':
        return send(302, '', { location: '/loop' });
      case '/to-ftp':
        return send(302, '', { location: 'ftp://example.com/' });
      case '/slow':
        return setTimeout(() => send(200, '1'), 500);
      default:
        return send(500, '{}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** The error `promise` rejects with. */
async function failure(promise: Promise<unknown>): Promise<RemoteJsonError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(RemoteJsonError);
  return error as RemoteJsonError;
}

describe('isPublicAddress', () => {
  it('accepts public addresses', () => {
    expect(isPublicAddress('93.184.216.34')).toBe(true);
    expect(isPublicAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(true);
  });

  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '::1',
    '::',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '64:ff9b::a00:1',
    'not an ip',
  ])('refuses %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
});

describe('fetchJson', () => {
  it('returns the parsed JSON body, asking for JSON', async () => {
    expect(await fetchJson(`${base}/users`, allowAll)).toEqual([{ name: 'Ada' }]);
    expect(await fetchJson(`${base}/accept`, allowAll)).toBe('application/json');
  });

  it('follows redirects', async () => {
    expect(await fetchJson(`${base}/redirect`, allowAll)).toEqual([{ name: 'Ada' }]);
  });

  it.each([
    ['not a url', 'Enter a full URL', 400],
    ['ftp://example.com/data.json', 'must start with http', 400],
    ['file:///etc/passwd', 'must start with http', 400],
    ['https://user:secret@example.com/', 'credentials', 400],
  ])('rejects the URL %s', async (url, message, status) => {
    const error = await failure(fetchJson(url));
    expect(error.message).toContain(message);
    expect(error.status).toBe(status);
  });

  it('refuses internal addresses by default, as IP literals or host names', async () => {
    for (const url of [`${base}/users`, 'http://[::1]/', 'http://localhost/']) {
      const error = await failure(fetchJson(url));
      expect(error.message, url).toBe("That address isn't allowed");
      expect(error.status).toBe(400);
    }
  });

  it('checks host names when connecting', async () => {
    const port = new URL(base).port;
    const error = await failure(
      fetchJson(`http://localhost:${port}/users`, { isAllowedAddress: () => false }),
    );
    expect(error.message).toBe("That address isn't allowed");
    expect(await fetchJson(`http://localhost:${port}/users`, allowAll)).toEqual([{ name: 'Ada' }]);
  });

  it.each([
    ['/missing', 'status 404'],
    ['/html', "isn't valid JSON"],
    ['/big', 'larger than 1 MB'],
    ['/big-chunked', 'larger than 1 MB'],
    ['/loop', 'Too many redirects'],
    ['/to-ftp', 'must start with http'],
  ])('reports %s', async (path, message) => {
    expect((await failure(fetchJson(`${base}${path}`, allowAll))).message).toContain(message);
  });

  it('gives up on slow servers', async () => {
    const error = await failure(fetchJson(`${base}/slow`, { ...allowAll, timeoutMs: 100 }));
    expect(error.message).toBe("The server didn't answer within 0.1 s");
    expect(error.status).toBe(502);
  });

  it('reports unknown hosts and refused connections', async () => {
    const unknown = await failure(fetchJson('http://nonexistent.invalid/', allowAll));
    expect(unknown.message).toBe('The host name could not be found');

    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const refused = await failure(fetchJson(`http://127.0.0.1:${port}/`, allowAll));
    expect(refused.message).toBe('Could not connect to the server');
  });
});
