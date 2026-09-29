import { getRequestUser } from '@/lib/auth/current-user';
import { renameTag } from '@/lib/data/mutations';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json(await renameTag(await getRequestUser(request), Number(id), await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to rename tag.' }, { status: 403 }); }
}
