import { MAX_PROJECT_BYTES, parseProject, projectSlug } from '@/lib/project';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { buildScaffold } from '@/lib/scaffold';
import { createZip } from '@/lib/zip';

const limiter = routeLimiter('export');

/** Exports a project as a runnable Next.js app: a ZIP with one top-level project folder. */
export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_PROJECT_BYTES) {
    return Response.json({ error: 'The project is too large to export' }, { status: 413 });
  }
  const result = parseProject(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const folder = projectSlug(result.content.name);
  const files = Object.fromEntries(
    Object.entries(buildScaffold(result.content)).map(([name, text]) => [
      `${folder}/${name}`,
      text,
    ]),
  );
  return new Response(new Uint8Array(createZip(files)), {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${folder}.zip"`,
    },
  });
}
