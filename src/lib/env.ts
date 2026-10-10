import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validated server-side environment. Read lazily at request time so a single build
 * can be promoted across environments with different values.
 */
export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
