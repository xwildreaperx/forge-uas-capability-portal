import { getRequestUser } from '@/lib/auth/current-user';
import { convertSubmissionToCanonicalProblem } from '@/lib/data/mutations';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json(await convertSubmissionToCanonicalProblem(await getRequestUser(request), id, await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to convert submission.', matches: error && typeof error === 'object' && 'matches' in error ? error.matches : undefined }, { status: 409 }); }
}
