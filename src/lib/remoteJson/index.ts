import 'server-only';
import { lookup as dnsLookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, type LookupFunction, isIP } from 'node:net';

/** Largest response accepted, in bytes. Mock data lives in the project file and localStorage. */
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/** A failure whose message is safe to show the user. */
export class RemoteJsonError extends Error {
  constructor(
    message: string,
    /** HTTP status for the API response: 400 for a bad URL, 502 when the remote end fails. */
    readonly status: 400 | 502,
  ) {
    super(message);
    this.name = 'RemoteJsonError';
  }
}

/**
 * Addresses a server-side fetch must never reach: loopback, private networks, link-local
 * (cloud metadata endpoints live there), carrier-grade NAT, multicast and reserved ranges.
 */
const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3], // multicast, reserved and broadcast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 127], // unspecified and loopback
  ['64:ff9b::', 96], // NAT64 can wrap any IPv4 address
  ['100::', 64],
  ['2001:db8::', 32],
  ['2002::', 16], // 6to4 can wrap any IPv4 address
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

/** Whether a resolved IP address is on the public internet. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family !== 6) return false;
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) reaches the IPv4 address.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return isPublicAddress(mapped);
  return !blocked.check(address, 'ipv6');
}

export interface FetchJsonOptions {
  /** Which resolved addresses may be connected to; tests allow loopback. */
  isAllowedAddress?: (address: string) => boolean;
  timeoutMs?: number;
}

/** Parses a user-entered URL, accepting only plain http(s) URLs. */
function parseUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RemoteJsonError('Enter a full URL, e.g. https://api.example.com/users', 400);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RemoteJsonError('The URL must start with http:// or https://', 400);
  }
  if (url.username || url.password) {
    throw new RemoteJsonError('URLs with credentials are not supported', 400);
  }
  return url;
}

/**
 * DNS lookup that refuses non-public addresses. It runs as the socket's own lookup, so the
 * checked address is the one connected to: a second resolution (DNS rebinding) can't swap it.
 */
function guardedLookup(isAllowed: (address: string) => boolean): LookupFunction {
  return (hostname, options, callback) => {
    dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error, '', 0);
      const list = addresses as { address: string; family: number }[];
      if (list.length === 0 || !list.every((entry) => isAllowed(entry.address))) {
        return callback(new BlockedAddressError(), '', 0);
      }
      if (options.all) return callback(null, list as never, 0);
      return callback(null, list[0]!.address, list[0]!.family);
    });
  };
}

class BlockedAddressError extends Error {
  readonly code = 'EBLOCKED';
}

interface RawResponse {
  status: number;
  location?: string;
  body: string;
}

function request(url: URL, options: Required<FetchJsonOptions>): Promise<RawResponse> {
  // IP literals skip DNS, so they are checked here.
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal) && !options.isAllowedAddress(literal)) {
    return Promise.reject(new RemoteJsonError("That address isn't allowed", 400));
  }

  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(
      url,
      {
        lookup: guardedLookup(options.isAllowedAddress),
        headers: { accept: 'application/json', 'user-agent': 'antd-builder' },
        signal: AbortSignal.timeout(options.timeoutMs),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: '' });
        }
        const declared = Number(res.headers['content-length']);
        if (declared > MAX_RESPONSE_BYTES) {
          req.destroy();
          return reject(tooLarge());
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            req.destroy();
            reject(tooLarge());
          } else {
            chunks.push(chunk);
          }
        });
        res.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      },
    );
    req.on('error', (error) => reject(networkError(error, options.timeoutMs)));
  });
}

const tooLarge = () =>
  new RemoteJsonError(`The response is larger than ${MAX_RESPONSE_BYTES / 1024 / 1024} MB`, 502);

function networkError(error: Error, timeoutMs: number): RemoteJsonError {
  if (error instanceof RemoteJsonError) return error;
  if (error instanceof BlockedAddressError) {
    return new RemoteJsonError("That address isn't allowed", 400);
  }
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return new RemoteJsonError(`The server didn't answer within ${timeoutMs / 1000} s`, 502);
  }
  const { code } = error as NodeJS.ErrnoException;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return new RemoteJsonError('The host name could not be found', 502);
  }
  return new RemoteJsonError('Could not connect to the server', 502);
}

/**
 * Fetches a JSON document from a public http(s) URL for use as mock data. Guards against
 * server-side request forgery: private and internal addresses are refused at connect time,
 * also after redirects, and responses are capped in size and time.
 */
export async function fetchJson(input: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const settings = {
    isAllowedAddress: options.isAllowedAddress ?? isPublicAddress,
    timeoutMs: options.timeoutMs ?? TIMEOUT_MS,
  };
  let url = parseUrl(input);
  for (let hop = 0; ; hop += 1) {
    const response = await request(url, settings);
    if (response.location === undefined) {
      if (response.status < 200 || response.status >= 300) {
        throw new RemoteJsonError(`The server answered with status ${response.status}`, 502);
      }
      try {
        return JSON.parse(response.body) as unknown;
      } catch {
        throw new RemoteJsonError("The response isn't valid JSON", 502);
      }
    }
    if (hop === MAX_REDIRECTS) throw new RemoteJsonError('Too many redirects', 502);
    url = parseUrl(new URL(response.location, url));
  }
}
