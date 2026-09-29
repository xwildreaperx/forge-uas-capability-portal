import { closeOutProject, resolveProjectId } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json(await closeOutProject(await getRequestUser(request), await resolveProjectId(id), await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to close out Project.' }, { status: 400 });
  }
}
