/** Runs once when the server starts: fail fast on missing or invalid configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { getServerEnv } = await import('@/lib/env');
  try {
    getServerEnv();
  } catch (error) {
    // Next.js would only log this and serve 500s; exit so the orchestrator sees a failed start.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
