export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The `error` message of an API error response, if it has one. */
function errorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  return typeof body.error === 'string' ? body.error : null;
}

/** A message for an error response without one, e.g. from a proxy in front of the app. */
function fallbackMessage(response: Response): string {
  if (response.status === 429) {
    const seconds = Number(response.headers.get('retry-after'));
    return seconds > 0
      ? `Too many requests. Try again in ${seconds} s.`
      : 'Too many requests. Try again in a minute.';
  }
  return `Request failed (${response.status})`;
}

/** POSTs JSON to one of the app's API routes; a failed request becomes a message to show. */
async function post(path: string, body: unknown): Promise<ApiResult<Response>> {
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
  if (response.ok) return { ok: true, value: response };
  const json: unknown = await response.json().catch(() => null);
  return { ok: false, error: errorMessage(json) ?? fallbackMessage(response) };
}

/**
 * POSTs JSON to one of the app's API routes and reads the JSON answer. Failures come back as a
 * message to show the user, never as a thrown error.
 */
export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const result = await post(path, body);
  if (!result.ok) return result;
  return { ok: true, value: (await result.value.json()) as T };
}

/** Like `postJson`, for routes that answer with a file. */
export async function postForFile(path: string, body: unknown): Promise<ApiResult<Blob>> {
  const result = await post(path, body);
  if (!result.ok) return result;
  return { ok: true, value: await result.value.blob() };
}
