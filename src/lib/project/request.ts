import { MAX_PROJECT_BYTES, type ProjectContent, parseProject } from '.';

export type ProjectRequest =
  | { ok: true; content: ProjectContent }
  /** The error response to send back. */
  | { ok: false; response: Response };

const fail = (error: string, status: number): ProjectRequest => ({
  ok: false,
  response: Response.json({ error }, { status }),
});

/**
 * Reads a project file sent to an API route: too large is a 413, and anything that wouldn't open
 * in the editor is a 400. A declared `Content-Length` over the limit is refused before reading.
 */
export async function readProjectRequest(request: Request): Promise<ProjectRequest> {
  const tooLarge = `The project is larger than ${MAX_PROJECT_BYTES / 1024 / 1024} MB`;
  if (Number(request.headers.get('content-length')) > MAX_PROJECT_BYTES) return fail(tooLarge, 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_PROJECT_BYTES) return fail(tooLarge, 413);

  const result = parseProject(body);
  return result.ok ? result : fail(result.error, 400);
}
