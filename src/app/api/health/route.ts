export const dynamic = 'force-dynamic';

/** Liveness probe for load balancers and container orchestration. */
export function GET() {
  return Response.json({ status: 'ok' });
}
