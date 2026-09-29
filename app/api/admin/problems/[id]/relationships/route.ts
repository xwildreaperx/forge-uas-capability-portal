import { getRequestUser } from '@/lib/auth/current-user';
import { setProblemRelationship } from '@/lib/data/mutations';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json(await setProblemRelationship(await getRequestUser(request), id, await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to update relationship.' }, { status: 403 }); }
}
