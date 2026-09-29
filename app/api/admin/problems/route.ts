import { getRequestUser } from '@/lib/auth/current-user';
import { createProblem } from '@/lib/data/mutations';

export async function POST(request: Request) {
  try { return Response.json(await createProblem(await getRequestUser(request), await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to create Problem.', matches: error && typeof error === 'object' && 'matches' in error ? error.matches : undefined }, { status: 409 }); }
}
