import { MAX_PROJECT_BYTES, parseProject, toProject } from '@/lib/project';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { saveShare } from '@/lib/shares';

const limiter = routeLimiter('share');

/**
 * Shares a project: stores a read-only snapshot and returns its id, viewable at `/s/<id>`.
 * The body is a project file; it is validated like an opened file, and saved without its
 * version history, which stays private to the author.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const tooLarge = () =>
    Response.json(
      { error: `The project is larger than ${MAX_PROJECT_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    );
  if (Number(request.headers.get('content-length')) > MAX_PROJECT_BYTES) return tooLarge();
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_PROJECT_BYTES) return tooLarge();

  const result = parseProject(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  try {
    const id = await saveShare(JSON.stringify(toProject({ ...result.content, versions: [] })));
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Saving a shared project failed', error);
    return Response.json({ error: 'Could not save the shared project' }, { status: 500 });
  }
}
