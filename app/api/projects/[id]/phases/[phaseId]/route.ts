import { resolveProjectId, updateProjectPhase } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';

export async function PATCH(request: Request, context: { params: Promise<{ id: string; phaseId: string }> }) {
  try {
    const { id, phaseId } = await context.params;
    return Response.json(await updateProjectPhase(await getRequestUser(request), await resolveProjectId(id), Number(phaseId), await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to update phase.' }, { status: 400 });
  }
}
