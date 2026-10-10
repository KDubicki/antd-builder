import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateComponent } from '@/lib/ai';
import { POST } from './route';

vi.mock('@/lib/ai', () => ({ generateComponent: vi.fn() }));

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/ai/component', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/ai/component', () => {
  it('rejects a missing prompt', async () => {
    expect((await post({})).status).toBe(400);
  });

  it('rejects an empty prompt', async () => {
    expect((await post({ prompt: '   ' })).status).toBe(400);
  });

  it('rejects a malformed JSON body', async () => {
    expect((await post('{not json')).status).toBe(400);
  });

  it('returns the generated source', async () => {
    vi.mocked(generateComponent).mockResolvedValue('export default function X() {}');

    const response = await post({ prompt: 'A pricing card' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: 'export default function X() {}' });
    expect(generateComponent).toHaveBeenCalledWith({
      apiKey: 'test-key',
      model: 'gemini-3.8-flash',
      prompt: 'A pricing card',
    });
  });

  it('hides upstream errors behind a generic 502', async () => {
    vi.mocked(generateComponent).mockRejectedValue(new Error('quota exceeded: secret detail'));

    const response = await post({ prompt: 'A pricing card' });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Component generation failed' });
  });
});
