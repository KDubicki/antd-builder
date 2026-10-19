import { toProject } from '@/lib/project';
import { readProjectRequest } from '@/lib/project/request';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { saveShare } from '@/lib/shares';

const limiter = routeLimiter('share');

/**
 * Shares a project: stores a read-only snapshot and returns its id, viewable at `/s/<id>`, and
 * a token for deleting it.
 * The body is a project file; it is validated like an opened file, and saved without its
 * version history, which stays private to the author.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const project = await readProjectRequest(request);
  if (!project.ok) return project.response;

  try {
    const share = await saveShare(JSON.stringify(toProject({ ...project.content, versions: [] })));
    return Response.json(share, { status: 201 });
  } catch (error) {
    console.error('Saving a shared project failed', error);
    return Response.json({ error: 'Could not save the shared project' }, { status: 500 });
  }
}
