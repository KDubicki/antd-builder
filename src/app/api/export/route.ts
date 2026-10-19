import { projectSlug } from '@/lib/project';
import { readProjectRequest } from '@/lib/project/request';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { buildScaffold } from '@/lib/scaffold';
import { createZip } from '@/lib/zip';

const limiter = routeLimiter('export');

/** Exports a project as a runnable Next.js app: a ZIP with one top-level project folder. */
export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const project = await readProjectRequest(request);
  if (!project.ok) return project.response;

  const folder = projectSlug(project.content.name);
  const files = Object.fromEntries(
    Object.entries(buildScaffold(project.content)).map(([name, text]) => [
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
