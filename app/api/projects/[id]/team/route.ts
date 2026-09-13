import { manageProjectTeam, resolveProjectId } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json(await manageProjectTeam(await getRequestUser(request), await resolveProjectId(id), await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to manage Project team.' }, { status: 400 });
  }
}
