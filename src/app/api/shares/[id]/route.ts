import { loadShare } from '@/lib/shares';

/** A shared project snapshot, as a project file. */
export async function GET(_request: Request, context: RouteContext<'/api/shares/[id]'>) {
  const { id } = await context.params;
  const json = await loadShare(id);
  if (json === null) return Response.json({ error: 'Shared project not found' }, { status: 404 });
  return new Response(json, { headers: { 'content-type': 'application/json' } });
}
