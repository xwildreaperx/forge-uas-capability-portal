import { updateProject } from '@/lib/data/mutations';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(await updateProject(id, await request.json()));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to update Project.',
      },
      { status: 400 },
    );
  }
}
