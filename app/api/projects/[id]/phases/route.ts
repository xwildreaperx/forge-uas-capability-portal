import { addProjectPhase, resolveProjectId } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(
      await addProjectPhase(
        await getRequestUser(request),
        await resolveProjectId(id),
        await request.json(),
      ),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unable to add phase.',
      },
      { status: 400 },
    );
  }
}
