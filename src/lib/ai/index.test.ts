import { describe, expect, it, vi } from 'vitest';
import { generateComponent, SYSTEM_PROMPT } from '.';

const generateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

describe('generateComponent', () => {
  it('sends the prompt with the system instruction and returns the text', async () => {
    generateContent.mockResolvedValue({ text: 'tsx source' });

    const source = await generateComponent({ apiKey: 'k', model: 'm', prompt: 'A card' });

    expect(source).toBe('tsx source');
    expect(generateContent).toHaveBeenCalledWith({
      model: 'm',
      contents: 'A card',
      config: { systemInstruction: SYSTEM_PROMPT },
    });
  });

  it('returns an empty string when the model returns no text', async () => {
    generateContent.mockResolvedValue({ text: undefined });
    expect(await generateComponent({ apiKey: 'k', model: 'm', prompt: 'x' })).toBe('');
  });
});
