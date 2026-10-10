import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('reports ok', async () => {
    expect(await GET().json()).toEqual({ status: 'ok' });
  });
});
