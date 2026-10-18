import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { deleteShare, loadShare } from '@/lib/shares';

const limiter = routeLimiter('shareDelete');

/** A shared project snapshot, as a project file. */
export async function GET(_request: Request, context: RouteContext<'/api/shares/[id]'>) {
  const { id } = await context.params;
  const share = await loadShare(id);
  if (share === null) return Response.json({ error: 'Shared project not found' }, { status: 404 });
  return new Response(share.json, {
    headers: {
      'content-type': 'application/json',
      ...(share.expiresAt ? { expires: new Date(share.expiresAt).toUTCString() } : {}),
    },
  });
}

/** Deletes a share. Needs the delete token returned when it was created, as a Bearer token. */
export async function DELETE(request: Request, context: RouteContext<'/api/shares/[id]'>) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Missing delete token' }, { status: 401 });

  const { id } = await context.params;
  const result = await deleteShare(id, token);
  if (result === 'not-found') {
    return Response.json({ error: 'Shared project not found' }, { status: 404 });
  }
  if (result === 'forbidden') {
    return Response.json({ error: "This link can't be deleted with that token" }, { status: 403 });
  }
  return new Response(null, { status: 204 });
}
