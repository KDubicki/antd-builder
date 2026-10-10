import 'server-only';
import { GoogleGenAI } from '@google/genai';

export const SYSTEM_PROMPT = `You generate React components for an Ant Design (antd v6) page builder.
Rules:
- Use TypeScript and antd components; avoid other UI libraries.
- Style through antd theme tokens (theme.useToken) rather than hard-coded colors.
- Default-export a single component whose props are fully typed.
- Respond with only the TSX source, no prose.`;

export interface GenerateComponentOptions {
  apiKey: string;
  model: string;
  /** Natural-language description of the element the user needs. */
  prompt: string;
}

export async function generateComponent({ apiKey, model, prompt }: GenerateComponentOptions) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { systemInstruction: SYSTEM_PROMPT },
  });
  return response.text ?? '';
}
