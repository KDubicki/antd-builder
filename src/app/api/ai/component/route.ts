import { z } from 'zod';
import { generateComponent } from '@/lib/ai';
import { getServerEnv } from '@/lib/env';
import { rateLimit, routeLimiter } from '@/lib/rateLimit';

const limiter = routeLimiter('aiComponent');

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, limiter);
  if (limited) return limited;

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  try {
    const env = getServerEnv();
    const source = await generateComponent({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      prompt: body.data.prompt,
    });
    return Response.json({ source });
  } catch (error) {
    console.error('AI component generation failed', error);
    return Response.json({ error: 'Component generation failed' }, { status: 502 });
  }
}
