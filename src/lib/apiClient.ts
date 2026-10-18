export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The `error` message of an API error response, if it has one. */
function errorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  return typeof body.error === 'string' ? body.error : null;
}

/**
 * POSTs JSON to one of the app's API routes and reads the JSON answer. Failures come back as a
 * message to show the user, never as a thrown error.
 */
export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection." };
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: errorMessage(json) ?? `Request failed (${response.status})` };
  }
  return { ok: true, value: json as T };
}
