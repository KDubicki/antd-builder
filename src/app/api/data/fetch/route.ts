import { z } from 'zod';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';
import { RemoteJsonError, fetchJson } from '@/lib/remoteJson';

const limiter = routeLimiter('dataFetch');

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** Fetches sample JSON from a public URL for a mock data source; the browser can't, due to CORS. */
export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  try {
    return Response.json({ data: await fetchJson(body.data.url) });
  } catch (error) {
    if (error instanceof RemoteJsonError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Fetching remote JSON failed', error);
    return Response.json({ error: 'Could not fetch the URL' }, { status: 502 });
  }
}
